/* eslint-disable @typescript-eslint/no-explicit-any */
import { container } from 'tsyringe';

import { LoggerFactory } from '@/logger';

export function log(
  this: any,
  { successMessage, errorMessage }: { successMessage?: string; errorMessage?: string } = {
    successMessage: '',
    errorMessage: '',
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
      try {
        const logger = loggerFactory.createLogger(String(propertyName));
        const result = await method.apply(this, args);
        logger.debug(successMessage || 'Successfully completed');
        return result;
      } catch (e) {
        const logger = loggerFactory.createLogger(String(propertyName));
        logger.error(errorMessage || (e as Error).message, 'params:', JSON.stringify(args));
        throw e;
      }
    };
  };
}
