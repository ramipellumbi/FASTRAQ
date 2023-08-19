# Fastify Server with Dependency Injection, Runtime Type Validation, Auto Doc Generation, And Logging

A `nodeJS` web API with [Fastify](https://github.com/fastify/fastify) for performance, [`TSyringe`](https://github.com/microsoft/tsyringe) for dependency injection, and [TypeBox](https://github.com/sinclairzx81/typebox) for auto generated Swagger documentation and runtime API input validation.

## Setup

Run `npm install` to install the dependencies. Use `npm run dev` to start the server. This runs the server setup by the `registrar` in `src/server/index.ts` on port 8080.

Generate the react query client by running `npm run generateclient`. Edit the location of the generated client in `generate-client.ts`.

## Usage

A server is a collection of services, which are a collection of endpoints. Every endpoint is typed using [TypeBox](https://github.com/sinclairzx81/typebox), which type-checks all of your endpoints and is used by [fastify-swagger](https://github.com/fastify/fastify-swagger) to generate API documentation for you. Authentication is supported by registering an `IAuthenticationMethod` to the container.

## Explaining the Architecture

There was a few wants that led to this architecture:

1. I wanted to be able to easily inject dependencies into my services.
2. I wanted a way to cleanly group and declare the routes for my services.
3. I wanted to be able to easily generate swagger documentation.
4. I wanted runtime type safety and validation for my API.
5. I wanted to be able to easily trace and group logs back to the request that invoked them.
6. I want to easily be able to mark routes as "requires authentication" vs. "no authentication required".

The below is an elaboration on how I achieved these wants.

### Easily Inject Dependencies - TSyringe

This project uses [`TSyringe`](https://github.com/microsoft/tsyringe) for dependency injection. All singleton classes that do not share a token are decorated with `@singleton()`. This both registers the service as a singleton to the container and marks the service as injectable.
Singleton classes that share tokens, like services, are marked with just `@injectable()` when they must inject their dependencies

### Cleanly Group and Declare Routes - Service Structure

Services are a collection of routes. Each service is a class decorated with `@Service('articles')`.
Each route is a method decorated with `@HttpMethod('myRoute')`.
Possible methods are `@Get`, `@Patch`, `@Post`, `@Put`, `@Delete`.
The `@HttpMethod` decorators takes a path as an argument.
The path is relative to the service's module path.
The `@HttpMethod` decorator also takes an optional object as a second argument.
This object defines whether the route is authenticated and the runtime validation schemas.
It contains the following properties

```typescript
// default export from `src/schemas/index.ts` that has all typebox schemas
type Schemas = typeof schemas;

interface IRoute {
  readonly auth: boolean;
  readonly body?: Extract<keyof TSchemas, string> | null;
  readonly params?: Extract<keyof TSchemas, string> | null;
  readonly query?: Extract<keyof TSchemas, string> | null;
  readonly response?: Extract<keyof TSchemas, string> | null;
}
```

Example service:

```typescript
// services/test.service.ts
import { injectable } from 'tsyringe';

import { Controller } from '@/mongodb';
import { Get, Post, Service, TypedRequest } from '@/server';

@injectable()
@Service('test')
export class TestService {
  constructor(private readonly _controller: Controller) {}

  @Get('/', {
    auth: true,
    query: 'GetDataQueryRequest',
    response: 'GetDataQueryResponse',
  })
  async getData(
    req: TypedRequest<{
      query: 'GetDataQueryRequest';
      response: 'GetDataQueryResponse';
    }>
  ) {
    const { facilities, date } = req.query;
    const data = await this._controller.getData(facilities, date);

    return { data };
  }
}
```

This registers the route `/test` with runtime validated query parameters and response as defined in `src/server/schemas`. The handler for response is the async function `getData`. This service would be made available to our server by registering it in the function `bootstrapServices` under `src/services/services.provider.ts` under the token `DI_TOKEN.SERVICE`:

```typescript
// src/services/services.provider.ts
import { container } from 'tsyringe';

import { DI_TOKEN } from '@/di';

import { TestService } from './test.service';

const bootstrapService = () => {
  container.registerSingleton<TestService>(DI_TOKEN.SERVICE, TestService);
};
```

### Auto Generated Documentation - Fastify Swagger

This project uses `Fastify` as a web server. The server has its routes registered by the `Registrar` in `server.registrar.ts`. This is a custom abstraction used to support this architecture. OpenAPI swagger documentation is auto generated from the typebox schemas.

### Runtime Type Safety and Validation for the API - Typebox

This project uses `Typebox` for type validation. Schemas are defined in `/src/schemas`. These schemas are used to validate requests and responses. Example schema:

```typescript
// src/schemas/test.ts
import { Static, Type } from '@sinclair/typebox';

export const GetDataQueryRequest = Type.Object({
  tags: Type.Array(Type.String()),
  author: Type.String(),
});

export type TGetDataQueryRequest = Static<typeof GetDataQueryRequest>;

export default {
  GetDataQueryRequest,
};
```

### Logging

The logging system is setup of so that all logs are logged under the `traceId` of the request invoking the log. E.g., `/test/data` is invoked simultaneously by `user-1` and `user-2`. The request fails for `user-1` but succeeds for `user-2`.
The logs would roughly look like:

```bash
[2023-08-16T18:56:00.000Z] INFO (traceId=req-1) - Request received
[2023-08-16T18:56:00.002Z] INFO (traceId=req-2) - Request received
[2023-08-16T18:56:00.100Z] INFO (traceId=req-2) - Request succeeded
[2023-08-16T18:56:00.105Z] DEBUG (traceId=req-1) - Error in getData
[2023-08-16T18:56:00.110Z] INFO (traceId=req-1) - Request failed
```

This is made possibly by `AsyncLocalStorage`. In the `onRequest` stage of the request lifecycle, the `TracingExtension` starts running our `ITracingStorage`. The `logger` generated by the `logger-factory` injects the same `ITracingStorage` and uses it to log the `traceId` of the request.

To add logging to a service, we simply inject the `LoggerFactory` and logging is automatically done with the `traceId` of the request. In the service example from earlier:

```typescript
// services/test.service.ts
import { injectable } from 'tsyringe';

import { LoggerFactory } from '@/logger';
import { Controller } from '@/mongodb';
import { Get, Post, Service, TypedRequest } from '@/server';

@injectable()
@Service('test')
export class TestService {
  private _logger = this._loggerFactory.getLogger('TestService');

  constructor(
    private readonly _controller: Controller,
    private readonly _loggerFactory: LoggerFactory
  ) {
    this._logger = this._loggerFactory.getLogger('TestService');
  }

  @Get('/', {
    auth: true,
    query: 'GetDataQueryRequest',
    response: 'GetDataQueryResponse',
  })
  async getData(
    req: TypedRequest<{
      query: 'GetDataQueryRequest';
      response: 'GetDataQueryResponse';
    }>
  ) {
    const { facilities, date } = req.query;
    const data = await this._controller.getData(facilities, date);

    this._logger.info('My Log');

    return { data };
  }
}
```

### Authentication

To set up authentication, we need to specify the `authenticate` method of the `IAuthenticationMethod` registered to the container in `src/index.ts`.

```typescript
container.register<IAuthenticationMethod>(DI_TOKEN.AUTHENTICATION, {
  useValue: { authenticate: undefined });
```
