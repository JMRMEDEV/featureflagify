import type { Flag } from "@featureflagify/shared";
import type { FlagRepository } from "./flag-repository";

export class InMemoryFlagRepository implements FlagRepository {
  private readonly records = new Map<string, Flag>();

  findAll(): Promise<readonly unknown[]> {
    return Promise.resolve([...this.records.values()]);
  }

  findByKey(key: string): Promise<unknown> {
    return Promise.resolve(this.records.get(key));
  }

  insert(flag: Flag): Promise<void> {
    this.records.set(flag.key, flag);
    return Promise.resolve();
  }

  update(flag: Flag): Promise<void> {
    this.records.set(flag.key, flag);
    return Promise.resolve();
  }
}
