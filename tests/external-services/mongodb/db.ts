/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;
mongoose.Promise = Promise;

export const connectDatabase = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri);
};

export const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

export const clearDatabase = async () => {
  const { collections } = mongoose.connection;
  const promises = [];
  for (const key in collections) {
    const collection = collections[key];
    promises.push(collection.deleteMany({}));
  }
  await Promise.all(promises);
};
