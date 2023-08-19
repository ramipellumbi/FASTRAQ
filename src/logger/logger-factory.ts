import { singleton } from 'tsyringe';

import { ILogger, Logger } from './logger';
import { LoggerCache } from './logger-cache';
import { TracingStorage } from './tracing-storage';

export interface ILoggerFactory {
  createLogger(name: string): ILogger;
}

@singleton()
export class LoggerFactory {
  constructor(private readonly _cache: LoggerCache, private readonly _storage: TracingStorage) {}

  createLogger(name: string): ILogger {
    return new Logger(name, this._cache, this._storage);
  }
}
