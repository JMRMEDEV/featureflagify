import { AsyncLocalStorage } from "node:async_hooks";
import type { LogFields } from "../logger";

interface RequestStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

/** Runs `next` so that everything it starts (service calls included) sees the request id. */
export function runWithRequestId(requestId: string, next: () => void): void {
  storage.run({ requestId }, next);
}

/** Logger context: puts the current request id on every line, including the service's. */
export function currentRequestFields(): LogFields {
  const store = storage.getStore();
  return store === undefined ? {} : { requestId: store.requestId };
}
