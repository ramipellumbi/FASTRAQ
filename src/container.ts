import fastify, { FastifyInstance } from "fastify";
import { container } from "tsyringe";

import { DI_TOKEN, EXTERNAL_SERVICE_TOKEN } from "./di";
import { ArticleModel, IArticleModel } from "./external-services/mongodb/articles";
import schemas from "./schemas";
import { IAuthenticationMethod, Schemas } from "./server";
import bootstrapExtensions from "./server/server.extensions";
import { Registrar } from "./server/server.registrar";
import { bootstrapServices } from "./services";

export const bootstrapContainer = (): FastifyInstance => {
  container.register<FastifyInstance>(DI_TOKEN.FASTIFY, {
    useValue: fastify(),
  });
  container.register<Schemas>(DI_TOKEN.SCHEMAS, { useValue: schemas });
  container.register<IAuthenticationMethod>(DI_TOKEN.AUTHENTICATION, {
    useValue: {
      authenticate: undefined,
    },
  });
  container.register<IArticleModel>(EXTERNAL_SERVICE_TOKEN.MONGO_MODEL, {
    useValue: ArticleModel,
  });

  bootstrapExtensions();
  bootstrapServices();

  const registrar = container.resolve(Registrar);

  return registrar.server;
};
