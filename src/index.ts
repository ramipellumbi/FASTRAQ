import "reflect-metadata";

import dotenv from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import thart from "thart";

import { bootstrapContainer } from "./container";

dotenv.config();

const port = (process.env.PORT && Number.parseInt(process.env.PORT)) || 8080;

const connectToMongodb = async () => {
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
};

const start = async (id: number) => {
  console.debug(`Starting server on worker ${id}...`);
  await connectToMongodb();
  const server = bootstrapContainer();

  await server.ready();
  await server.listen({ port, host: "0.0.0.0" });
  console.debug(`Server started on worker ${id}!`);
};

thart({
  grace: 5000,
  worker: {
    start,
    stop: async () => {
      await mongoose.disconnect();
      console.debug("Server stopped!");
    },
    type: "cluster",
    count: 2,
  },
});
