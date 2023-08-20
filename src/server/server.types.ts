import { Static, TSchema } from '@sinclair/typebox';
import { FastifyRequest, RouteHandlerMethod } from 'fastify';

import { TSchemas } from '@/schemas';

/**
 * Valid HTTP methods.
 */
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Represents a set of JSON schemas.
 */
export type Schemas = {
  [id: string]: TSchema;
};

export interface IAuthenticationMethod {
  authenticate: RouteHandlerMethod | undefined;
}

/**
 * Specification for a route.
 */
export interface IRoute {
  readonly auth: boolean;
  readonly body?: Extract<keyof TSchemas, string> | null;
  readonly params?: Extract<keyof TSchemas, string> | null;
  readonly query?: Extract<keyof TSchemas, string> | null;
  readonly response?: Extract<keyof TSchemas, string> | null;
}

/**
 * Type for the request object received by a route
 */
export type TypedRequest<T extends Pick<IRoute, 'body' | 'params' | 'query' | 'response'>> =
  FastifyRequest<{
    Body: Static<TSchemas[NonNullable<T['body']>]>;
    Querystring: Static<TSchemas[NonNullable<T['query']>]>;
    Params: Static<TSchemas[NonNullable<T['params']>]>;
    Reply: Static<TSchemas[NonNullable<T['response']>]>;
  }>;

/**
 * Type for the response object returned by a route
 */
export type TypedResponse<T extends IRoute> = T['response'] extends keyof TSchemas
  ? Promise<Static<TSchemas[NonNullable<T['response']>]>>
  : Promise<void>;

/**
 * Type type routes of a service as added as
 */
export type IRouteConfig = {
  url: string;
  auth: boolean;
  method: Method;
  schema: {
    querystring?: { $ref: string };
    params?: { $ref: string };
    body?: { $ref: string };
    response: { 200?: { $ref: string } };
    operationId: string;
  };
};
