import { container } from 'tsyringe';

import { ILogger, LoggerFactory } from '@/logger';

type LogDecoratorParams = {
  successMessage?: string;
  errorMessage?: string;
  logArgs?: boolean;
};

export function log(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this: any,
  messages: LogDecoratorParams = {
    successMessage: '',
    errorMessage: '',
    logArgs: true,
  }
) {
  return (
    _target: unknown,
    propertyName: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor?: TypedPropertyDescriptor<(...inputs: any[]) => any> | any
  ) => {
    if (!descriptor) {
      throw new Error('Error in decorator - no descriptor');
    }

    const method = descriptor.value;
    if (!method) {
      throw new Error('Error in decorator - no method');
    }

    const isAsync = method.constructor.name === 'AsyncFunction';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (...args: any[]) {
      const loggerFactory = container.resolve(LoggerFactory);
      const logger = getLogger(loggerFactory, _target, propertyName);

      if (isAsync) {
        return executeAsyncMethod.call(this, method, args, messages, logger);
      } else {
        return executeSyncMethod.call(this, method, args, messages, logger);
      }
    };
  };
}

function getLogger(loggerFactory: LoggerFactory, _target: unknown, propertyName: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const className = (_target as any)?.constructor?.name;
  const functionName = String(propertyName);
  const service = className ? `${className}.${functionName}` : `${functionName}`;
  const logger = loggerFactory.createLogger(service);
  return logger;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logResult(logger: ILogger, messages: LogDecoratorParams, result: any) {
  logger.debug(
    messages.successMessage || 'Successfully completed',
    'result:',
    JSON.stringify(result)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logError(logger: ILogger, messages: LogDecoratorParams, error: Error, args: any[]) {
  const shouldLogArgs = messages.logArgs ?? true;
  logger.error(
    messages.errorMessage || error.message,
    'params:',
    shouldLogArgs ? JSON.stringify(args) : ''
  );
}

function executeSyncMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  method: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[],
  messages: LogDecoratorParams,
  logger: ILogger
) {
  try {
    const result = method.apply(this, args);
    logResult(logger, messages, result);
    return result;
  } catch (e) {
    if (e instanceof Error) {
      logError(logger, messages, e, args);
    }
    throw e;
  }
}

async function executeAsyncMethod(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  method: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[],
  messages: LogDecoratorParams,
  logger: ILogger
) {
  try {
    const result = await method.apply(this, args);
    logResult(logger, messages, result);
    return result;
  } catch (e) {
    if (e instanceof Error) {
      logError(logger, messages, e, args);
    }
    throw e;
  }
}
