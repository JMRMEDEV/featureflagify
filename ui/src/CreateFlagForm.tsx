import {
  flagDescriptionSchema,
  flagKeySchema,
  flagNameSchema,
  type CreateFlagBody,
  type Flag,
} from '@featureflagify/shared';
import { useId, useState, type FormEvent } from 'react';
import type { ManagementClient, ManagementError } from './api/management-client';

type Field = 'key' | 'name' | 'description';
type FieldErrors = Partial<Record<Field, string>>;

type Failure = { readonly fields: FieldErrors; readonly form: readonly string[] };

function isField(value: string): value is Field {
  return value === 'key' || value === 'name' || value === 'description';
}

/** Turns a failed create call into field errors and form-level messages. */
function describeFailure(error: ManagementError): Failure {
  switch (error.kind) {
    case 'network':
      return { fields: {}, form: ['Could not reach the flag API. The flag was not created.'] };
    case 'not-configured':
      return { fields: {}, form: ['The flag API URL is not configured.'] };
    case 'invalid-request':
      return { fields: {}, form: ['The request was not valid, so nothing was sent.'] };
    case 'http':
      return { fields: {}, form: [`The flag API answered with status ${error.status}.`] };
    case 'invalid-response':
      return {
        fields: {},
        form: ['The flag API sent an unreadable answer. Reload the list to see if the flag was created.'],
      };
    case 'api': {
      if (error.code === 'FLAG_EXISTS') {
        return { fields: { key: error.message }, form: [] };
      }
      if (error.code === 'INTERNAL_ERROR') {
        return {
          fields: {},
          form: ['The server had a problem and the flag was not created. Try again.'],
        };
      }
      if (error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
        const fields: FieldErrors = {};
        const form: string[] = [];
        for (const detail of error.details) {
          if (isField(detail.field)) {
            const previous = fields[detail.field];
            fields[detail.field] =
              previous === undefined ? detail.message : `${previous} ${detail.message}`;
          } else {
            form.push(`${detail.field}: ${detail.message}`);
          }
        }
        return { fields, form };
      }
      return { fields: {}, form: [error.message] };
    }
  }
}

/** Validates the form values with the shared schemas. Nothing is sent when this fails. */
function validate(
  key: string,
  name: string,
  description: string,
): { body: CreateFlagBody } | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  const keyResult = flagKeySchema.safeParse(key);
  if (!keyResult.success) {
    errors.key = keyResult.error.issues[0]?.message ?? 'Invalid flag key';
  }
  if (name !== '' && !flagNameSchema.safeParse(name).success) {
    errors.name = 'Name must be 1 to 100 characters.';
  }
  if (!flagDescriptionSchema.safeParse(description).success) {
    errors.description = 'Description must be 500 characters or fewer.';
  }
  if (!keyResult.success || errors.name !== undefined || errors.description !== undefined) {
    return { errors };
  }
  const body: CreateFlagBody = { key: keyResult.data };
  if (name !== '') body.name = name;
  if (description !== '') body.description = description;
  return { body };
}

export type CreateFlagFormProps = {
  readonly client: ManagementClient;
  /** True when management actions are off, for example when the API is unavailable. */
  readonly disabled: boolean;
  readonly disabledReason: string;
  readonly onCreated: (flag: Flag) => void;
};

export function CreateFlagForm({ client, disabled, disabledReason, onCreated }: CreateFlagFormProps) {
  const id = useId();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formErrors, setFormErrors] = useState<readonly string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || disabled) return;
    setFormErrors([]);
    const checked = validate(key.trim(), name.trim(), description);
    if ('errors' in checked) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const result = await client.createFlag(checked.body);
    setSubmitting(false);
    if (result.ok) {
      setKey('');
      setName('');
      setDescription('');
      onCreated(result.data);
      return;
    }
    const failure = describeFailure(result.error);
    setErrors(failure.fields);
    setFormErrors(failure.form);
  }

  function clearError(field: Field): void {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  const ids = {
    key: `${id}-key`,
    name: `${id}-name`,
    description: `${id}-description`,
  };
  const hintId = `${ids.key}-hint`;
  const describedBy = (field: Field): string | undefined => {
    const parts = field === 'key' ? [hintId] : [];
    if (errors[field] !== undefined) parts.push(`${ids[field]}-error`);
    return parts.length === 0 ? undefined : parts.join(' ');
  };

  return (
    <form className="create-form" onSubmit={(event) => void submit(event)} noValidate>
      <h2>Create a flag</h2>
      <fieldset disabled={disabled || submitting}>
        <div className="field">
          <label htmlFor={ids.key}>Key</label>
          <input
            id={ids.key}
            name="key"
            type="text"
            value={key}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.key !== undefined}
            aria-describedby={describedBy('key')}
            onChange={(event) => {
              setKey(event.target.value);
              clearError('key');
            }}
          />
          <p id={hintId} className="hint">
            Lowercase letters, digits and hyphens. 2 to 64 characters.
          </p>
          {errors.key !== undefined && (
            <p id={`${ids.key}-error`} className="field-error">
              {errors.key}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={ids.name}>Name (optional)</label>
          <input
            id={ids.name}
            name="name"
            type="text"
            value={name}
            maxLength={100}
            aria-invalid={errors.name !== undefined}
            aria-describedby={describedBy('name')}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
          />
          {errors.name !== undefined && (
            <p id={`${ids.name}-error`} className="field-error">
              {errors.name}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={ids.description}>Description (optional)</label>
          <textarea
            id={ids.description}
            name="description"
            value={description}
            maxLength={500}
            rows={2}
            aria-invalid={errors.description !== undefined}
            aria-describedby={describedBy('description')}
            onChange={(event) => {
              setDescription(event.target.value);
              clearError('description');
            }}
          />
          {errors.description !== undefined && (
            <p id={`${ids.description}-error`} className="field-error">
              {errors.description}
            </p>
          )}
        </div>
        {formErrors.length > 0 && (
          <div role="alert" className="form-error">
            {formErrors.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}
        <button type="submit">{submitting ? 'Creating…' : 'Create flag'}</button>
      </fieldset>
      {disabled && <p className="hint">{disabledReason}</p>}
    </form>
  );
}
