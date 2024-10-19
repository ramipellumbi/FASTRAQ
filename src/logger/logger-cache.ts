import { singleton } from "tsyringe";

import { TracingStorage } from "./tracing-storage";

export type LogLevel = "info" | "error" | "debug";

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
  // maximum number of messages to cache per request
  private readonly _MAX_MESSAGES_PER_TRACE = 25;

  private readonly _cache: Map<string, Array<ILog>>;

  constructor(private readonly _storage: TracingStorage) {
    this._cache = new Map<string, Array<ILog>>();
  }

  add(log: ILog): void {
    const traceId = this._storage.traceId;

    if (!this._cache.has(traceId)) {
      this._cache.set(traceId, [{ ...log }]);
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
    this._cache.delete(traceId);
  }

  get(traceId: string): Array<ILog> {
    return this._cache.get(traceId) || [];
  }
}
