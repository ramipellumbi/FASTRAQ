import swagger, { SwaggerOptions } from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { container, inject, singleton } from 'tsyringe';

import { DI_TOKEN } from '@/di';
import { HTTPError } from '@/errors';
import { ILogger, LoggerFactory, TracingStorage } from '@/logger';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    logger: ILogger;
  }
}

export interface IServerExtension {
  setup(): void;
}

@singleton()
class ErrorExtension implements IServerExtension {
  constructor(
    @inject(DI_TOKEN.FASTIFY) private readonly _server: FastifyInstance,
    private readonly _loggerFactory: LoggerFactory
  ) {}

  setup() {
    this._server.addHook('preHandler', async (request) => {
      request.logger = this._loggerFactory.createLogger(request.method + ' ' + request.routerPath);
    });

    this._server.setErrorHandler((error, request, reply) => {
      const logger = request.logger;

      if (logger) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        logger.dumpAllLogs();
      }

      if (error instanceof HTTPError) {
        reply.code(error.statusCode).send({ detail: error.message });
      } else if (error instanceof Error) {
        reply.code(500).send({ detail: error.message });
      } else {
        reply.code(500).send({ detail: 'Unknown error.' });
      }
    });
  }
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
  [ErrorExtension, SwaggerExtension, TracingExtension].forEach((ext) => {
    container.registerSingleton<IServerExtension>(DI_TOKEN.SERVER_EXTENSION, ext);
  });
}
