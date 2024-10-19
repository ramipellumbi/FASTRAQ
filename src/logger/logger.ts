import winston from "winston";

import { LogLevel, LoggerCache } from "./logger-cache";
import { TracingStorage } from "./tracing-storage";

export interface ILogger {
  debug(...messages: string[]): void;
  info(...messages: string[]): void;
  error(...messages: string[]): void;

  dumpInfoLogs(): void;
  dumpAllLogs(): void;
}

export class Logger implements ILogger {
  private readonly _logger: winston.Logger;

  constructor(
    private readonly _service: string,
    private readonly _cache: LoggerCache,
    private readonly _storage: TracingStorage,
  ) {
    winston.addColors({
      info: "bold blue",
      error: "bold red",
      debug: "bold green",
    });

    this._logger = winston.createLogger({
      level: "debug",
      format: winston.format.combine(winston.format.timestamp(), this._customFormat(), winston.format.json()),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            this._customFormat(),
            winston.format.colorize({ all: true }),
          ),
        }),
      ],
    });
  }

  private _customFormat(): winston.Logform.Format {
    return winston.format.printf(({ timestamp, level, source, message, service, traceId }) => {
      return `[${timestamp}] ${level.toUpperCase()} (service=${service}, source=${source}, traceId=${traceId}) - ${message}`;
    });
  }

  public dumpInfoLogs(): void {
    const logs = this._cache.get(this._storage.traceId).filter((log) => log.level === "info");
    for (const log of logs) {
      const formattedMessage = log.messages.join(" ");
      this._logger.info(formattedMessage, {
        service: log.service,
        source: this._service,
        traceId: this._storage.traceId,
      });
    }
    this._cache.remove(this._storage.traceId);
  }

  public dumpAllLogs(): void {
    for (const log of this._cache.get(this._storage.traceId)) {
      const formattedMessage = log.messages.join(" ");
      this._logger[log.level](formattedMessage, {
        service: log.service,
        source: this._service,
        traceId: this._storage.traceId,
      });
    }
    this._cache.remove(this._storage.traceId);
  }
  private _logToCache(level: LogLevel, messages: string[]): void {
    this._cache.add({
      service: this._service,
      messages,
      level,
    });
  }

  debug(...messages: string[]): void {
    this._logToCache("debug", messages);
  }

  info(...messages: string[]): void {
    this._logToCache("info", messages);
  }

  error(...messages: string[]): void {
    this._logToCache("error", messages);
  }
}
