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
  remove(traceId: string): void;
  get(traceId: string): Array<ILog>;
}

@singleton()
export class LoggerCache implements ILoggerCache {
  // maximum number of requests to cache
  private readonly _MAX_CACHE_SIZE = 50;
  // maximum number of messages to cache per request
  private readonly _MAX_MESSAGES_PER_TRACE = 25;

  private readonly _cache: Map<string, Array<ILog>>;
  private readonly _queue: Array<string>;

  constructor(private readonly _storage: TracingStorage) {
    this._cache = new Map<string, Array<ILog>>();
    this._queue = [];
  }

  add(log: ILog): void {
    const traceId = this._storage.traceId;

    if (!this._cache.has(traceId)) {
      if (this._cache.size >= this._MAX_CACHE_SIZE) {
        const oldestTraceId = this._queue.shift();
        if (!oldestTraceId) return;
        this._cache.delete(oldestTraceId);
      }

      this._cache.set(traceId, [{ ...log }]);
      this._queue.push(traceId);
    } else {
      const messages = this._cache.get(traceId);
      if (!messages) return;
      if (messages.length >= this._MAX_MESSAGES_PER_TRACE) {
        messages.shift();
      }
      messages.push({ ...log });
    }
  }

  remove(traceId: string): void {
    const didDelete = this._cache.delete(traceId);
    if (didDelete) {
      const index = this._queue.indexOf(traceId);
      if (index >= 0) {
        this._queue.splice(index, 1);
      }
    }
  }

  get(traceId: string): Array<ILog> {
    return this._cache.get(traceId) || [];
  }
}
