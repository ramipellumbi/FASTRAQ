# Fastify-Based NodeJS API Toolkit

Welcome to the Fastify-Based NodeJS API Toolkit, a platform to create type-safe and well-documented web APIs using Fastify. The toolkit seamlessly integrates features like dependency injection, auto-generated documentation, auto-generated react-query client, and comprehensive logging.

- [License](#license)
- [Setup](#setup)
- [Usage](#usage)
- [Architecture Overview](#architecture-overview)
- [Managing Complex Services](#managing-complex-services)
- [Conclusion](#conclusion)

## License

This work is duel licensed under the [MIT License](./LICENSE.md) and the [Apache License 2.0](./LICENSE-APACHE-2.md). You're free to choose the one that suits your project. Please ensure all uses, modifications, and distributions comply with the chosen license's terms.

## Setup

### Installation

Install all the required dependencies

```bash
npm install
```

### Running the Server

To start the server on port `8080` (or `process.env.PORT` if set):

```bash
npm run dev
```

The server setup is driven by the registrar located in src/server/index.ts.

### Client Generation

To generate the react query client:

```bash
npm run generateclient
```

You can modify the client's output location in generate-client.ts.

## Usage

A server is a collection of services, which are a collection of endpoints. Every endpoint is typed using [TypeBox](https://github.com/sinclairzx81/typebox), which type-checks all of your endpoints and is used by [fastify-swagger](https://github.com/fastify/fastify-swagger) to generate API documentation for you. Authentication is supported by registering an `IAuthenticationMethod` to the container.

## Architecture Overview

This project was designed with the following goals:

1. **Dependency Injection**: Easily inject dependencies into services.
2. **Route Management**: Easily group and declare routes.
3. **Documentation**: Auto-generate Swagger documentation.
4. **Type Safety**: Ensure runtime type safety and validation for the API.
5. **Logging**: Trace logs back to their originating request.
6. **Authentication**: Easily enable / disable a routes authentication.

Below, we explore the solutions to these goals:

### Easily Inject Dependencies - TSyringe

This project uses [`tsyringe`](https://github.com/microsoft/tsyringe) for dependency injection. All singleton classes that are not registered to the container under the same token are decorated with `@singleton()`.
This both registers the service as a singleton to the container and marks the service as injectable.
Singleton classes that are registered to the container under the same token values, like services, are marked with just `@injectable()` when they must inject their dependencies.

### Cleanly Group and Declare Routes - Service Structure

Services are a collection of routes. Each service is a class decorated with `@Service('articles')`.
Each route of a service is a class method decorated with `@HttpMethod('myRoute')`.
Possible methods are `@Get`, `@Patch`, `@Post`, `@Put`, `@Delete`.
The `@HttpMethod` decorators takes a path as an argument.
The path is relative to the service's module path.
The `@HttpMethod` decorator also takes an optional object as a second argument.
This object defines whether the route is authenticated and the runtime validation schemas.
It contains the following properties

```typescript
// default export from `src/schemas/index.ts` that has all typebox schemas
type TSchemas = typeof schemas;

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

  @Get('/me', {
    auth: true,
    query: 'GetDataQueryParams',
    response: 'GetDataResponse',
  })
  async getData(
    req: TypedRequest<{
      query: 'GetDataQueryParams';
      response: 'GetDataResponse';
    }>
  ) {
    const { facilities, date } = req.query;
    const data = await this._controller.getData(facilities, date);

    return { data };
  }
}
```

This registers the route `GET /test/me` with query parameters `GetDataQueryParams` and response `GetDataResponse` (see [below](#runtime-type-safety-and-validation-for-the-api---typebox) for example declaration). The handler for the route is the async function `getData`. This service is made available to the server by registering it in the function `bootstrapServices` under `src/services/services.provider.ts` under the token `DI_TOKEN.SERVICE`:

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

This project uses `fastify-swagger` to auto-generate swagger documentation. It is set up in `src/server/server.extensions.ts` in the `SwaggerExtension`. The Swagger documentation is auto generated from the typebox schemas.

The server has its routes registered as plugins by the `Registrar` in `server.registrar.ts` so that they are visible in the Swagger docs. The `Registrar` is a custom abstraction used to support this architecture.

### Runtime Type Safety and Validation for the API - Typebox

This project uses `Typebox` for type validation. Schemas are defined in `/src/schemas`. These schemas are used to validate requests and responses. Example schema:

```typescript
// src/schemas/test.ts
import { Static, Type } from '@sinclair/typebox';

export const GetDataQueryParams = Type.Object(
  {
    tags: Type.Array(Type.String()),
    author: Type.String(),
  },
  { $id: 'GetDataQueryParams' }
);
export const GetDataResponse = Type.Object(
  {
    data: Type.Array(
      Type.Object({
        id: Type.String(),
        title: Type.String(),
        content: Type.String(),
      })
    ),
  },
  { $id: 'GetDataResponse' }
);

export type TGetDataQueryRequest = Static<typeof GetDataQueryRequest>;
export type TGetDataResponse = Static<typeof GetDataResponse>;

export default {
  GetDataQueryRequest,
  GetDataResponse,
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

To add logging to a service, controller, or custom class, we simply inject the `LoggerFactory`. Logging is tied with the `traceId` of the request invoking the function. In the service example from earlier:

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
    query: 'GetDataQueryParams',
    response: 'GetDataResponse',
  })
  async getData(
    req: TypedRequest<{
      query: 'GetDataQueryParams';
      response: 'GetDataResponse';
    }>
  ) {
    const { facilities, date } = req.query;
    const data = await this._controller.getData(facilities, date);

    this._logger.info('My Log');

    return { data };
  }
}
```

#### Logging Decorator

To add quick logging to a function, we can use the `log` decorator. This decorator takes an optional input `{ successMessage, errorMessage }`. This decorator will add logging around the function in the case of success and error. The `successMessage` and `errorMessage` are optional and default to `Successfully completed functionName` and `error.message`, respectively. Success logs are `debug` level, and error logs are `error` level. All logs will be logged under the `traceId` of the request invoking the function. Example:

```typescript
// external-services/mongodb/test.controller.ts
import { singleton } from 'tsyringe';

import { log } from '@/decorators';
import { Model } from '@/mongodb';

@singleton()
export class TestController {
  constructor(private readonly _model: Model) {}

  @log({ successMessage: 'Helper function completed successfully' })
  helperFunction() {
    // ...
  }

  @log({ successMessage: 'Data retrieved successfully' })
  async getData(facilities: string[], date: string) {
    // ...
  }
}
```

This lets us add debug and error logs to our log dump on error and is useful for being able to trace back to the point of application failure. For lower level logging, we can use the logger factory as shown above.

### Authentication

To set up authentication, we need to specify the `authenticate` method of the `IAuthenticationMethod` registered to the container in `src/index.ts`. All routes marked with `auth: true` will require the `authenticate` function to move the request past the `preHandler` stage of the request lifecycle.

```typescript
container.register<IAuthenticationMethod>(DI_TOKEN.AUTHENTICATION, {
  useValue: { authenticate: undefined },
});
```

## Managing Complex Services

In situations where a service contains intricate routes, it's useful to separate concerns for clarity and maintainability. Here are a couple of patterns to manage such scenarios:

### Mediator Design Pattern for Route Handling

```typescript
// services/advanced/advanced.service.ts

export class AdvancedService {
  constructor(private readonly _handlerFactory: AdvancedServiceHandlerFactory) {}

  @Get('/advanced', {
    auth: true,
    query: 'GetAdvancedHandlerQueryParams',
    response: 'GetAdvancedHandlerResponse',
  })
  async advancedHandler(
    req: TypedRequest<{
      query: 'GetAdvancedHandlerQueryParams';
      response: 'GetAdvancedHandlerResponse';
    }>
  ) {
    const response = await this._handlerFactory.getAdvancedHandler().handle(req);

    return response;
  }

  @Get('/advanced-2', {
    auth: true,
    query: 'GetAdvancedHandlerTwoQueryParams',
    response: 'GetAdvancedHandlerTwoResponse',
  })
  async advancedHandler(
    req: TypedRequest<{
      query: 'GetAdvancedHandlerTwoQueryParams';
      response: 'GetAdvancedHandlerTwoResponse';
    }>
  ) {
    const response = await this._handlerFactory.getAdvancedHandlerTwo().handle(req);

    return response;
  }
}
```

The handler factory is responsible for injecting the shared dependencies of all the handlers and returning the correct handler for the route. E.g.:

```typescript
// services/advanced/advanced-service-handler-factory.ts
interface IHandler<T extends IRoute> {
  handle(request: TypedRequest<T>): TypedResponse<T>;
}

interface IAdvancedServiceHandlerFactory {
  getAdvancedHandler(): IHandler<{
    query: 'GetAdvancedHandlerQueryParams';
    response: 'GetAdvancedHandlerResponse';
  }>;
  getAdvancedHandlerTwo(): IHandler<{
    query: 'GetAdvancedHandlerTwoQueryParams';
    response: 'GetAdvancedHandlerTwoResponse';
  }>;
}

@singleton()
export class AdvancedServiceHandlerFactory implements IAdvancedServiceHandlerFactory {
  constructor(
    private readonly _controller: Controller,
    private readonly _storage: Storage,
    private readonly _loggerFactory: LoggerFactory
  ) {}

  getAdvancedHandler() {
    return new AdvancedHandler(this._controller, this._storage, this._loggerFactory);
  }

  getAdvancedHandlerTwo() {
    return new AdvancedHandlerTwo(this._controller, this._loggerFactory);
  }
}
```

### Multiple Service Classes

Another possible pattern is to instead create a `Service` class for each route - all under the same module name. E.g.:

```typescript
// services/advanced/advanced-handler.service.ts
@injectable()
@Service('advanced')
export class AdvancedHandlerService {
  constructor(
    private readonly _controller: Controller,
    private readonly _storage: Storage,
    private readonly _loggerFactory: LoggerFactory
  ) {}

  @Get('/advanced', {
    auth: true,
    query: 'GetAdvancedHandlerQueryParams',
    response: 'GetAdvancedHandlerResponse',
  })
  async advancedHandler(
    req: TypedRequest<{
      query: 'GetAdvancedHandlerQueryParams';
      response: 'GetAdvancedHandlerResponse';
    }>
  ) {
    // implement complex route here
  }
}

// services/advanced/advanced-handler-two.service.ts
@injectable()
@Service('advanced')
export class AdvancedHandlerServiceTwo {
  constructor(
    private readonly _controller: Controller,
    private readonly _loggerFactory: LoggerFactory
  ) {}

  @Get('/advanced-2', {
    auth: true,
    query: 'GetAdvancedHandlerTwoQueryParams',
    response: 'GetAdvancedHandlerTwoResponse',
  })
  async advancedHandler(
    req: TypedRequest<{
      query: 'GetAdvancedHandlerTwoQueryParams';
      response: 'GetAdvancedHandlerTwoResponse';
    }>
  ) {
    // complex implementation two
  }
}

// src/services/services.provider.ts
import { container } from 'tsyringe';

import { DI_TOKEN } from '@/di';

import { AdvancedHandlerService, AdvancedHandlerServiceTwo } from './advanced';

const bootstrapService = () => {
  container.registerSingleton<AdvancedHandlerService>(DI_TOKEN.SERVICE, AdvancedHandlerService);
  container.registerSingleton<AdvancedHandlerServiceTwo>(
    DI_TOKEN.SERVICE,
    AdvancedHandlerServiceTwo
  );
};
```

## Conclusion

This toolkit provides a robust foundation for creating a well-structured Fastify-based NodeJS API. With features like dependency injection, auto-documentation, and advanced logging, developers can focus more on building the actual API logic and less on boilerplate setup.

For further exploration, consider checking out the [Fastify documentation](https://www.fastify.io/docs/), [tsyringe](https://github.com/microsoft/tsyringe), [fastify-swagger](https://github.com/fastify/fastify-swagger), and [TypeBox GitHub](https://github.com/sinclairzx81/typebox).
