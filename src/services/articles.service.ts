import { injectable } from 'tsyringe';

import { LoggerFactory } from '@/logger';
import { ArticlesController } from '@/mongodb';
import { Get, Service, TypedRequest } from '@/server';

@injectable()
@Service('articles')
export class ArticlesService {
  constructor(
    private readonly _controller: ArticlesController,
    private readonly _loggerFactory: LoggerFactory
  ) {}

  @Get('/', { auth: true, query: 'GetArticlesQueryParams', response: 'GetArticlesResponse' })
  async getArticles(
    req: TypedRequest<{ query: 'GetArticlesQueryParams'; response: 'GetArticlesResponse' }>
  ) {
    const logger = this._loggerFactory.createLogger('ArticlesService.getArticles');
    const articles = await this._controller.getArticles(req.query);

    logger.info('Articles found', articles.length.toString());

    return { articles };
  }
}
