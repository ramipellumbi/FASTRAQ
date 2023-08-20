# Fastify-Based NodeJS API Template

This is my Fastify-Based NodeJS API template, an attempt to create organized, type-safe, and well-documented APIs using Fastify.
The architecture aims to seamlessly integrate features like dependency injection, auto-generated documentation, auto-generated [react-query](https://tanstack.com/query/v3/) client, and comprehensive logging.

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

The server setup is driven by the registrar in [`src/index.ts`](./src/index.ts).

### Viewing the Swagger Documentation

To view the swagger documentation, navigate to `http://serverurl/docs/index.html#`.
On localhost, this is [`http://localhost:8080/docs/index.html#`](http://localhost:8080/docs/index.html#).

### Client Generation

To generate the [react-query](https://tanstack.com/query/v3/) client:

```bash
npm run generateclient
```

You can modify the client's output location in `generate-client.ts`. You will have to change the script in the [`package.json`](./package.json) file to match the new location.

## Usage

A server is a collection of services, which are a collection of endpoints. Every endpoint is typed using [typebox](https://github.com/sinclairzx81/typebox), which type-checks all of the endpoints and is used by [fastify-swagger](https://github.com/fastify/fastify-swagger) to generate API documentation for you. Authentication is supported by registering an `IAuthenticationMethod` to the dependency container.

## Architecture Overview

This project was designed with the following goals:

1. [**Dependency Injection**](#easily-inject-dependencies---tsyringe): Easily inject dependencies into services, controllers, etc.
2. [**Route Management**](#cleanly-group-and-declare-routes---service-structure): Easily group and declare routes.
3. [**Documentation**](#auto-generated-documentation---fastify-swagger): Auto-generate Swagger documentation.
4. [**Type Safety**](#runtime-type-safety-and-validation-for-the-api---typebox): Ensure runtime type safety and validation for the API.
5. [**Logging**](#logging): Trace logs back to their originating request.
6. [**Authentication**](#authentication): Easily enable / disable a routes authentication.
7. **Client Generation**: Auto-generate a [react-query](https://tanstack.com/query/v3/) client for [`react`](https://react.dev/) apps.
8. [**Testing**](#testing): Easily test the server.

Below, we explore the solutions to these goals:

### Easily Inject Dependencies - `tsyringe`

This project uses [`tsyringe`](https://github.com/microsoft/tsyringe) for dependency injection, offering a streamlined way to manage dependencies.

- **Singleton Decorator**: Singleton classes in the template code, when not under a shared token, employ the `@singleton()` decorator. This action not only registers the service to the container as a singleton but also flags it as injectable. For instance:

  ```typescript
  @singleton()
  class TestController {}
  ```

  This is a shorthand for:

  ```typescript
  class TestController {}
  container.registerSingleton<TestController>(TestController);
  ```

  Such a class can be directly and effortlessly injected into others:

  ```typescript
  @injectable()
  class SomeService {
    constructor(private readonly _testController: TestController) {}
  }
  ```

- **Interfaces and Tokens**: For enhanced maintainability, it's often desirable to operate with interfaces rather than concrete classes. This introduces the need to register the interface with a specific token and then associate that token with its concrete implementation. Here's an example:

  ```typescript
  interface ITestController {
    /// ...
  }

  class TestController implements ITestController {
    /// ...
  }

  const ITestControllerToken = Symbol('ITestController');

  container.registerSingleton<ITestController>(ITestControllerToken, TestController);
  ```

  Now, to inject the interface, we utilize:

  ```typescript
  @injectable()
  class SomeService {
    constructor(@inject(ITestControllerToken) private readonly _testController: ITestController) {}
  }
  ```

  This approach is essential due to TypeScript's nature, where interfaces exist at design-time but vanish during runtime. Thus, the token acts as a bridge to link the interface with its concrete counterpart during dependency resolution.

The method you choose largely depends on the clarity and flexibility you desire in your application's architecture. Leveraging interfaces with tokens provides a clear demarcation between contract (interface) and implementation, optimizing the project for maintainability and scalability.

### Cleanly Group and Declare Routes - Service Structure

#### **Service Decorator**

- Each service is represented as a class and is decorated with `@Service('serviceName')`.
  - Example: `@Service('articles')` would denote a service related to articles.

#### **Route Decorators**

- Routes within a service are class methods that use specific HTTP method decorators.
  - The available HTTP method decorators are: `@Get`, `@Patch`, `@Post`, `@Put`, and `@Delete`.
- Route decorators accept:
  - A path, which is relative to the service's module.
    - Example: `@Get('/me')` inside of `@Service('articles')` would denote a route `GET /articles/me`.
  - An optional configuration object that specifies route properties such as authentication and validation schemas.

#### HttpMethod Configuration

For the `@HttpMethod` decorator, the configuration object can contain:

```typescript
// Import of all typebox schemas from `src/schemas/index.ts`
type TSchemas = typeof schemas;

interface IRoute {
  readonly auth: boolean; // Indicates if route is authenticated
  readonly body?: Extract<keyof TSchemas, string> | null; // Body validation schema
  readonly params?: Extract<keyof TSchemas, string> | null; // URL parameters validation schema
  readonly query?: Extract<keyof TSchemas, string> | null; // Query parameters validation schema
  readonly response?: Extract<keyof TSchemas, string> | null; // Response validation schema
}
```

#### Example Service

```typescript
// services/test.service.ts
import { injectable } from 'tsyringe';

import { Controller } from '@/mongodb';
import { Get, Post, Service, TypedRequest } from '@/server';

@injectable()
@Service('test')
export class TestService {
  constructor(private readonly _controller: Controller) {}
  //          ^^ Injected dependency

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
    const { date } = req.query;
    const data = await this._controller.getData(date);

    return { data };
  }
}
```

This registers the route `GET /test/me` with query parameters `GetDataQueryParams` and response `GetDataResponse` (see [below](#runtime-type-safety-and-validation-for-the-api---typebox) for example declaration). The handler for the route is the async function `getData`. This service is made available to the server by registering it in the function `bootstrapServices` in [`src/services/services.provider.ts`](./src/services/services.provider.ts) under the token [`DI_TOKEN.SERVICE`](./src/di.ts):

```typescript
// src/services/services.provider.ts
import { container } from 'tsyringe';

import { DI_TOKEN } from '@/di';

import { TestService } from './test.service';

const bootstrapService = () => {
  container.registerSingleton<TestService>(DI_TOKEN.SERVICE, TestService);
};
```

### Auto Generated Documentation - `fastify-swagger`

This project leverages [`fastify-swagger`](https://github.com/fastify/fastify-swagger) to automatically generate Swagger documentation based on the typebox schemas.

#### Setup and Configuration

- **Location**: The `fastify-swagger` is configured in the `SwaggerExtension` located at [`src/server/server.extensions.ts`](./src/server/server.extensions.ts).

- **Route Registration**: The server uses a [`Registrar`](./src/server/server.registrar.ts) to register routes as plugins. This ensures that the routes are correctly represented in the Swagger documentation.

- **Note**: The [`Registrar`](./src/server/server.registrar.ts) is an abstraction designed to facilitate this specific architecture and its integration with the route registration, API type validation, and Swagger docs.

### Runtime Type Safety and Validation for the API - `typebox``

This project uses [`typebox`](https://github.com/sinclairzx81/typebox) for type validation. Schemas are defined in `/src/schemas`. These schemas are used to validate request route parameters, query parameters, bodies, and responses. Example schemas:

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

The logging system is designed for clarity and traceability. Every log entry is tagged with the traceId of the originating request, enabling precise tracking of individual request lifecycles. Adopting an event-driven debug logging approach, the system behaves as follows:

- **Successful Requests**: Only the 'info' logs pertinent to the request are logged.

- **Failed Requests**: Alongside the 'info' logs, the 'debug' and 'error' logs relevant to the request are also captured.

This methodology ensures that developers can quickly discern the flow and potential issues of any request, streamlining diagnostics and debugging.

#### Sample Output

When two users (e.g., user-1 and user-2) simultaneously invoke `/test/data`, the logs would resemble:

```bash
[2023-08-16T18:56:00.000Z] INFO (traceId=req-1) - Request received
[2023-08-16T18:56:00.002Z] INFO (traceId=req-2) - Request received
[2023-08-16T18:56:00.100Z] INFO (traceId=req-2) - Request succeeded
[2023-08-16T18:56:00.103Z] DEBUG (traceId=req-1) - Succesfully ran helper
[2023-08-16T18:56:00.105Z] ERROR (traceId=req-1) - Error in getData
```

#### Technical Implementation

- This is made possible by `AsyncLocalStorage`.
- During the `onRequest` phase of a request's lifecycle, our `TracingExtension` initializes the `ITracingStorage`.
- The `Logger`, crafted by the `LoggerFactory`, incorporates the `ITracingStorage` to log each request's traceId.

#### How to Integrate Logging

To infuse logging into any service, controller, or class, simply inject the `LoggerFactory`. All logs will align with the `traceId` of the triggering request.

```typescript
// services/test.service.ts
import { injectable } from 'tsyringe';

import { LoggerFactory } from '@/logger';
import { Controller } from '@/mongodb';
import { Get, Post, Service, TypedRequest } from '@/server';

@injectable()
@Service('test')
export class TestService {
  private readonly _logger: Logger;

  constructor(
    private readonly _controller: Controller,
    private readonly _loggerFactory: LoggerFactory
  ) {
    this._logger = this._loggerFactory.createLogger('TestService');
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
    const { date } = req.query;
    const data = await this._controller.getData(date);

    this._logger.info('My Log');

    return { data };
  }
}
```

#### Logging Decorator

For a quick logging integration, utilize the `@log()` decorator. This decorator optionally accepts `{ successMessage, errorMessage, logArgs }`, which default to `"Successfully completed functionName"`, `error.message`, and `true`, respectively.

- Success Logs: These are of debug level.
- Error Logs: These are of error level.
- Log Args: These are the arguments passed to the function. If `true`, the arguments are logged on error. If `false`, the arguments are not logged.
- All logs correspond to the traceId of the initiating request.

##### Decorator Example

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
  async getData(date: string) {
    // ...
  }
}
```

These logs are crucial for tracing back to potential points of application failure. For more granular logging needs, utilize the logger factory as demonstrated above.

### Authentication

The project incorporates authentication via the `authenticate` method, which belongs to the `IAuthenticationMethod` interface. This method is essential for controlling access to your routes.

#### Configuration Steps

1. **Registration**: Register the `IAuthenticationMethod` to the container. You can find this registration to the container in [`src/index.ts`](./src/index.ts).

2. **Route Access Control**: Routes with the `auth: true` property necessitate successful authentication. These routes will only advance beyond the `preHandler` phase of the request lifecycle if the `authenticate` function is executed successfully.

#### Sample Configuration

```typescript
// Registering the IAuthenticationMethod to the container
container.register<IAuthenticationMethod>(DI_TOKEN.AUTHENTICATION, {
  useValue: { authenticate: undefined },
});
```

This configuration ensures that the specified routes have an added layer of security.

### Testing

The project incorporates [`jest`](https://jestjs.io/docs/es6-class-mocks) and [`jest-mock-extended`](https://www.npmjs.com/package/jest-mock-extended) for creating and running tests.

- **Configuration**: Ensure the path aliases are correctly registered in [`jest.config.js`](./jest.config.js).

- **Test Location**: All tests are situated in the `tests/` directory. This structure mirrors the `src/` directory.

#### Sample Tests

##### **Test with Mocks**

Using `jest-mock-extended` allows for easy mock creation without manually defining every mock property or method.

```typescript
// File: test/services/test.service.test.ts
import 'reflect-metadata';
import { TestService } from '@/services';
import { mock } from 'jest-mock-extended';

describe('TestService', () => {
  // Mocking the TestService class
  const mockedTestService = mock<TestService>();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should run a mocked method correctly', () => {
    // Add your mock configurations and tests here
  });
});
```

##### **Test without Mocks**

For cases where we don't require mocks and want to test the real implementation:

```typescript
// File: test/external-services/mongodb/controller.test.ts
import 'reflect-metadata';
import { TestController } from '@/external-services';

describe('TestController', () => {
  it('should run a method correctly', () => {
    const controller = new TestController(/* dependencies if any */);
    // Add your test assertions and checks here
  });
});
```

## Managing Complex Services

As the number of routes in a service grows, and their logic becomes more involved, it can lead to bulky service classes. To maintain clarity and ensure services are easier to manage, consider the following approaches:

### Mediator Design Pattern for Route Handling

With this approach, you encapsulate route logic in separate handler classes. The service then relies on a handler factory to get the appropriate handler for each route.

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

For situations with distinct sets of routes, you can split them across multiple service classes. All these services can exist under the same module name, ensuring that they remain part of the same logical group.

#### Split Services Under One Module

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
    // implement complex route here
  }
}
```

To make sure services are discoverable and initialized correctly, register them in the [services provider](./src/services//services.provider.ts):

```typescript
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

By splitting routes intelligently or encapsulating route logic in handlers, you can make sure services are easier to understand, manage, and extend in the future.

## Conclusion

This architecture tries to offer a well-structured and simple way to develop Fastify-based NodeJS APIs. It goes beyond the simplicity of framework usage, integrating features like dependency injection, auto-generated documentation, route authentication, and comprehensive logging. These features shift the focus from getting caught up in the intricacies of setup to instead honing in on building efficient, impactful, and innovative API functionalities.

To truly harness the power of this template and expand on its capabilities, diving deeper into the [Fastify documentation](https://www.fastify.io/docs/), exploring the utility of [tsyringe](https://github.com/microsoft/tsyringe), understanding the magic behind [fastify-swagger](https://github.com/fastify/fastify-swagger), and getting a grasp on [typebox](https://github.com/sinclairzx81/typebox) are strongly recommended.
