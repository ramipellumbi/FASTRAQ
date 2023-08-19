import swagger, { SwaggerOptions } from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { container, inject, singleton } from 'tsyringe';

import { DI_TOKEN } from '@/di';
import { TracingStorage } from '@/logger';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
  }
}

export interface IServerExtension {
  setup(): void;
}

@singleton()
class SwaggerExtension implements IServerExtension {
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

  constructor(@inject(DI_TOKEN.FASTIFY) private readonly _server: FastifyInstance) {}

  public setup() {
    this._server.register(swagger, this._swaggerOptions);
    this._server.register(swaggerUI, {
      routePrefix: '/docs',
    });
  }
}

@singleton()
class TracingExtension implements IServerExtension {
  constructor(
    @inject(DI_TOKEN.FASTIFY) private readonly _server: FastifyInstance,
    private readonly _storage: TracingStorage
  ) {}

  public setup() {
    this._server.addHook('onRequest', (request, _reply, done) => {
      const traceId = nanoid(12);
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
