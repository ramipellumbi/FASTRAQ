import swagger, { SwaggerOptions } from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { nanoid } from 'nanoid';
import { container, inject, singleton } from 'tsyringe';

import { DI_TOKEN } from '@/di';
import { TracingStorage } from '@/logger';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    authenticate: RouteHandlerMethod;
  }
}

export interface IServerExtension {
  setup(): void;
}

export abstract class BaseServerExtension implements IServerExtension {
  abstract setup(): void;
}

@singleton()
class SwaggerExtension extends BaseServerExtension {
  private readonly _swaggerOptions: SwaggerOptions = {
    openapi: {
      info: {
        title: 'My API',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    refResolver: {
      buildLocalReference: (json, _baseUri, _fragment, i) => `${json.$id}` || `def-${i}`,
    },
  };

  constructor(@inject(DI_TOKEN.FASTIFY) private readonly _server: FastifyInstance) {
    super();
  }

  public setup() {
    this._server.register(swagger, this._swaggerOptions);
    this._server.register(swaggerUI, {
      routePrefix: '/docs',
    });
  }
}

@singleton()
class TracingExtension extends BaseServerExtension {
  constructor(
    @inject(DI_TOKEN.FASTIFY) private readonly _server: FastifyInstance,
    private readonly _storage: TracingStorage
  ) {
    super();
  }

  public setup() {
    this._server.addHook('onRequest', (request, _reply, done) => {
      const traceId = 'req-' + nanoid(8);
      request.traceId = traceId;
      this._storage.run(traceId, done);
    });
  }
}

export default function bootstrapExtensions() {
  [SwaggerExtension, TracingExtension].forEach((ext) => {
    container.registerSingleton<IServerExtension>(DI_TOKEN.SERVER_EXTENSION, ext);
  });
}
