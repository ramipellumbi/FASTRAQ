import { FastifyInstance } from 'fastify';
import { container, inject, injectAll, singleton } from 'tsyringe';

import { MODULE_META_DATA_KEY, ROUTES_META_DATA_KEY } from './server.decorators';
import { IServerExtension } from './server.extensions';
import { IAuthenticationMethod, IRouteConfig } from './server.types';
import { Schemas } from './server.types';

import { DI_TOKEN } from '@/di';
import { ILogger, LoggerFactory } from '@/logger';

interface IRegistrar {
  server: FastifyInstance;
}

@singleton()
export class Registrar implements IRegistrar {
  private readonly _ROUTES: string[] = [];

  constructor(
    @inject(DI_TOKEN.FASTIFY) private readonly _server: FastifyInstance,
    @inject(DI_TOKEN.AUTHENTICATION)
    private readonly _authenticator: IAuthenticationMethod,
    @inject(DI_TOKEN.SCHEMAS) private readonly _schemas: Schemas,
    @injectAll(DI_TOKEN.SERVER_EXTENSION)
    private readonly _extensions: IServerExtension[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @injectAll(DI_TOKEN.SERVICE) private readonly _services: any[],
    private readonly _loggerFactory: LoggerFactory
  ) {
    this._registerExtensions();
    this._registerSchemas();
    this._registerServices();
  }

  public get server(): FastifyInstance {
    return this._server;
  }

  private _registerExtensions() {
    for (const extension of this._extensions) {
      extension.setup();
    }
  }

  private _registerSchemas() {
    for (const $id in this._schemas) {
      this._server.addSchema(this._schemas[$id]);
    }
  }

  private _registerServices() {
    for (const service of this._services) {
      const routes: IRouteConfig[] = Reflect.getMetadata(ROUTES_META_DATA_KEY, service.constructor);
      const module: string = Reflect.getMetadata(MODULE_META_DATA_KEY, service.constructor);
      if (!module) {
        throw new Error(
          'A controller must be decorated with @Controller and specify the module name.'
        );
      }
      if (typeof module !== 'string') {
        throw new Error('Module name of controller must be a string.');
      }

      this._server.register((server, _opts, done) => {
        routes.forEach((route) => {
          if (this._ROUTES.includes(route.schema.operationId)) {
            throw new Error(`Duplicate route: ${module} ${route.schema.operationId}`);
          }
          this._ROUTES.push(route.schema.operationId);

          const url = `/${module}${route.url.replace(/\/$/, '')}`;
          server.route({
            ...route,
            ...(route.auth === true &&
              this._authenticator.authenticate && {
                preHandler: this._authenticator.authenticate,
              }),
            schema: {
              ...route.schema,
              tags: [module],
            },
            url,
            handler: async (request, reply) => {
              let logger: ILogger | undefined;

              try {
                logger = this._loggerFactory.createLogger(request.routerPath);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const instance: any = container.resolve(service.constructor);
                const method = instance[route.schema.operationId];

                const result = await method.call(instance, request);
                logger.dumpInfoLogs();
                reply.code(200).send(result);
              } catch (e) {
                if (logger) {
                  logger.dumpAllLogs();
                }

                if (e instanceof Error) {
                  reply.code(500).send({ detail: e.message });
                } else {
                  reply.code(500).send({ detail: 'Unknown Erro' });
                }
              }
            },
          });
        });
        done();
      });
    }

    // empty the routes array
    this._ROUTES.length = 0;
  }
}
