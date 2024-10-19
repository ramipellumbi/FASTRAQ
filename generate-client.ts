import "reflect-metadata";

import dotenv from "dotenv";
import fs from "node:fs";
import orval from "orval";

import { bootstrapContainer } from "./src/container";

const OPENAPI_PATH = "./openapi.tmp.json";

dotenv.config();

async function generateClient() {
  const server = bootstrapContainer();
  await server.ready();
  const openapiSpec = server.swagger();
  await server.close();
  await fs.promises.writeFile(OPENAPI_PATH, JSON.stringify(openapiSpec, null, 2));
  await orval({
    input: OPENAPI_PATH,
    output: {
      client: "react-query",
      workspace: "../client/src/generated_client",
      schemas: "./models",
      target: "./client",
      mode: "tags-split",
      prettier: true,
    },
  });
  await fs.promises.unlink(OPENAPI_PATH);
}

generateClient();
