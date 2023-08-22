import 'reflect-metadata';

import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import throng from 'throng';

import { bootstrapContainer } from './container';

dotenv.config();

const port = (process.env.PORT && parseInt(process.env.PORT)) || 8080;

const connectToMongodb = async () => {
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
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
