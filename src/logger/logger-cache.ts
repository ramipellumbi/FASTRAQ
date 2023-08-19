import { singleton } from 'tsyringe';

import { TracingStorage } from './tracing-storage';

export type LogLevel = 'info' | 'error' | 'debug';

type ILog = {
  level: LogLevel;
  service: string;
  messages: string[];
};

export interface ILoggerCache {
  add(log: ILog): void;
  get(traceId: string): Array<ILog>;
}

@singleton()
export class LoggerCache implements ILoggerCache {
  private readonly _cache: Map<string, Array<ILog>>;
  private readonly _queue: Array<string>;

  constructor(private readonly _storage: TracingStorage) {
    this._cache = new Map<string, Array<ILog>>();
    this._queue = [];
  }

  add(log: ILog): void {
    const traceId = this._storage.traceId;

    if (!this._cache.has(traceId)) {
      if (this._cache.size >= 100) {
        const oldestTraceId = this._queue.shift();
        if (!oldestTraceId) return;
        this._cache.delete(oldestTraceId);
      }

      this._cache.set(traceId, [{ ...log }]);
      this._queue.push(traceId);
    } else {
      const messages = this._cache.get(traceId);
      if (!messages) return;
      messages.push({ ...log });
    }
  }

  get(traceId: string): Array<ILog> {
    return this._cache.get(traceId) || [];
  }
}
