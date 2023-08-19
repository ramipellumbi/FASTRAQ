/* eslint-disable @typescript-eslint/no-explicit-any */
import { IRoute, IRouteConfig, Method, TypedRequest, TypedResponse } from './server.types';

export const ROUTES_META_DATA_KEY = Symbol('routes');
export const MODULE_META_DATA_KEY = Symbol('module');

export function Service(module: string) {
  return function <T extends { new (...args: any[]): object }>(constructor: T) {
    Reflect.defineMetadata(MODULE_META_DATA_KEY, module, constructor);

    return constructor;
  };
}

export const Get = createRouteDecorator('GET');
export const Delete = createRouteDecorator('DELETE');
export const Patch = createRouteDecorator('PATCH');
export const Post = createRouteDecorator('POST');
export const Put = createRouteDecorator('PUT');

function createRouteDecorator(httpMethod: Method) {
  return function decorator<const R extends IRoute>(this: any, url: string, spec?: R) {
    return (
      _target: any,
      propertyName: string | symbol,
      descriptor: TypedPropertyDescriptor<(...args: TypedRequest<R>[]) => TypedResponse<R>>
    ) => {
      if (!descriptor) {
        throw new Error('Error in decorator - no descriptor');
      }

      if (!url.startsWith('/')) {
        throw new Error('Error in route decorator - url must start with "/"');
      }

      const routes: IRouteConfig[] =
        Reflect.getMetadata(ROUTES_META_DATA_KEY, _target.constructor) || [];
      routes.push({
        url,
        method: httpMethod,
        auth: spec?.auth ?? false,
        schema: {
          ...(spec?.query && {
            querystring: { $ref: spec.query },
          }),
          ...(spec?.params && {
            params: { $ref: spec.params },
          }),
          ...(spec?.body && {
            body: { $ref: spec.body },
          }),
          response: {
            ...(spec?.response && {
              200: { $ref: spec.response },
            }),
          },
          operationId: String(propertyName),
        },
      });
      Reflect.defineMetadata(ROUTES_META_DATA_KEY, routes, _target.constructor);
    };
  };
}
