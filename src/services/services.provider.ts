import { container } from "tsyringe";

import { HelloService } from "./hello.service";

import { DI_TOKEN } from "@/di";

export const bootstrapServices = () => {
  container.registerSingleton<HelloService>(DI_TOKEN.SERVICE, HelloService);
};
