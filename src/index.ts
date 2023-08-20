import 'reflect-metadata';

import dotenv from 'dotenv';
import fastify, { FastifyInstance } from 'fastify';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import throng from 'throng';
import { container } from 'tsyringe';

import { DI_TOKEN, EXTERNAL_SERVICE_TOKEN } from './di';
import { ArticleModel, IArticleModel } from './external-services/mongodb/articles';
import schemas from './schemas';
import { IAuthenticationMethod, Schemas } from './server';
import bootstrapExtensions from './server/server.extensions';
import { Registrar } from './server/server.registrar';
import { bootstrapServices } from './services';

dotenv.config();

const port = (process.env.PORT && parseInt(process.env.PORT)) || 8080;

const connectToMongodb = async () => {
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
};

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

const start = async () => {
  console.debug('Starting server...');
  await connectToMongodb();
  const server = bootstrapContainer();

  await server.ready();
  await server.listen({ port, host: '0.0.0.0' });
  console.debug('Server started!');
};

throng({
  lifetime: Infinity,
  start,
  workers: process.env.WEB_CONCURRENCY || 1,
});
