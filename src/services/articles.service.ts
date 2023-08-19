import { injectable } from 'tsyringe';

import { ArticlesController } from '@/mongodb';
import { Get, Service, TypedRequest } from '@/server';

@injectable()
@Service('articles')
export class ArticlesService {
  constructor(private readonly _controller: ArticlesController) {}

  @Get('/', { auth: true, query: 'GetArticlesQueryParams', response: 'GetArticlesResponse' })
  async getBookings(
    req: TypedRequest<{ query: 'GetArticlesQueryParams'; response: 'GetArticlesResponse' }>
  ) {
    const articles = await this._controller.getArticles(req.query);

    return { articles };
  }
}
