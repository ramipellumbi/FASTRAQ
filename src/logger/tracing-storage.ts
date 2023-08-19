import { AsyncLocalStorage } from 'async_hooks';
import { HookHandlerDoneFunction } from 'fastify';
import { singleton } from 'tsyringe';

type TStore = Map<string, string>;

export interface ITracingStorage {
  run(traceId: string, callback: HookHandlerDoneFunction): void;
  traceId: string;
}

@singleton()
export class TracingStorage implements ITracingStorage {
  private readonly _KEY = 'request-info' as const;
  private readonly _storage: AsyncLocalStorage<TStore> = new AsyncLocalStorage();

  public run(traceId: string, callback: HookHandlerDoneFunction) {
    return this._storage.run(new Map<string, string>([[this._KEY, traceId]]), callback);
  }

  public addCallerToStore() {
    const store = this._storage.getStore();
    if (store) {
      store.set(this._KEY, this.traceId);
    }
  }

  public get traceId(): string {
    return this._storage.getStore()?.get(this._KEY) ?? 'Unknown Trace';
  }
}
