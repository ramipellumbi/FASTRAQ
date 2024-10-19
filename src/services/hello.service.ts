import { injectable } from "tsyringe";

import { ILogger, LoggerFactory } from "@/logger";
import { Get, Service, TypedRequest } from "@/server";

@injectable()
@Service("articles")
export class HelloService {
  private readonly _logger: ILogger;
  constructor(private readonly _loggerFactory: LoggerFactory) {
    this._logger = this._loggerFactory.createLogger("HelloService");
  }

  @Get("/", { auth: true, query: "GetHelloWorldQueryParams", response: "GetHelloWorldResponse" })
  async getArticles(req: TypedRequest<{ query: "GetHelloWorldQueryParams" }>) {
    this._logger.info("Hello World");
    return { hello: "world" };
  }
}
