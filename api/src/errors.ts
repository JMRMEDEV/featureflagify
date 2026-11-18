/** Domain errors. Plain classes: the HTTP adapter maps them to the error envelope. */

export class FlagExistsError extends Error {
  readonly key: string;

  constructor(key: string) {
    super("A flag with this key already exists");
    this.name = "FlagExistsError";
    this.key = key;
  }
}

export class FlagNotFoundError extends Error {
  readonly key: string;

  constructor(key: string) {
    super("Flag not found");
    this.name = "FlagNotFoundError";
    this.key = key;
  }
}
