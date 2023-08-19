/* eslint-disable @typescript-eslint/no-explicit-any */
import { LogLevel } from 'fastify';
import { TransformableInfo } from 'logform';
import util from 'util';
import winston from 'winston';

import { LoggerCache } from './logger-cache';
import { TracingStorage } from './tracing-storage';

export interface ILogger {
  debug(message: string, ...splat: string[]): void;
  info(message: string, ...splat: string[]): void;
  error(message: string, ...splat: string[]): void;

  dumpInfoLogs(): void;
  dumpAllLogs(): void;
}

export class Logger implements ILogger {
  private readonly _logger: winston.Logger;

  constructor(
    private readonly _service: string,
    private readonly _cache: LoggerCache,
    private readonly _storage: TracingStorage
  ) {
    this._logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        this._combineMessageAndSplat(),
        winston.format.json()
      ),
      defaultMeta: { service: _service },
    });
    this._logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
  }

  public dumpInfoLogs(): void {
    this._cache
      .get(this._storage.traceId)
      .filter((log) => log.level === 'info')
      .forEach((log) => {
        log.messages.forEach((message) => {
          this._logger.info(this._storage.traceId, message);
        });
      });
  }

  public dumpAllLogs(): void {
    this._cache.get(this._storage.traceId).forEach((log) => {
      log.messages.forEach((message) => {
        this._logger.info(this._storage.traceId, message);
      });
    });
  }

  private _combineMessageAndSplat() {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      transform: (info: TransformableInfo, _opts?: any) => {
        info.message = util.format(
          info.message,
          ...(info[Symbol.for('splat') as any] || [])
        );
        return info;
      },
    };
  }

  private _logToCache(level: LogLevel, message: string, ...splat: any[]): void {
    this._cache.add({
      service: this._service,
      messages: [message, ...splat],
      level,
    });
  }

  debug(message: string, ...splat: string[]): void {
    this._logToCache('debug', message, ...splat);
  }

  info(message: string, ...splat: any[]): void {
    this._logToCache('info', message, ...splat);
  }

  error(message: string, ...splat: any[]): void {
    this._logToCache('error', message, ...splat);
  }
}
