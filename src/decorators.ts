/* eslint-disable @typescript-eslint/no-explicit-any */
import { container } from 'tsyringe';

import { LoggerFactory } from '@/logger';

type LogMessages = {
  successMessage?: string;
  errorMessage?: string;
  logArgs?: boolean;
};

export function log(
  this: any,
  messages: LogMessages = {
    successMessage: '',
    errorMessage: '',
    logArgs: true,
  }
) {
  return (
    _target: unknown,
    propertyName: unknown,
    descriptor?: TypedPropertyDescriptor<(...inputs: any[]) => Promise<any>> | any
  ) => {
    if (!descriptor) {
      throw new Error('Error in decorator - no descriptor');
    }

    const method = descriptor.value;
    if (!method) {
      throw new Error('Error in decorator - no method');
    }

    descriptor.value = async function (...args: any[]) {
      const loggerFactory = container.resolve(LoggerFactory);

      const className = (_target as any)?.constructor?.name;
      const functionName = String(propertyName);
      const service = className ? `${className}.${functionName}` : `${functionName}`;
      try {
        const logger = loggerFactory.createLogger(service);
        const result = await method.apply(this, args);
        logger.debug(messages.successMessage || 'Successfully completed');
        return result;
      } catch (e) {
        const logger = loggerFactory.createLogger(service);
        logger.error(
          messages.errorMessage || (e as Error).message,
          'params:',
          messages.logArgs ? JSON.stringify(args) : ''
        );
        throw e;
      }
    };
  };
}
