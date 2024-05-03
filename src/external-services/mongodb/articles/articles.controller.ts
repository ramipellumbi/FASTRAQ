import { FilterQuery } from 'mongoose';
import { inject, singleton } from 'tsyringe';

import { IArticleModel } from './articles.schema';

import { log } from '@/decorators';
import { EXTERNAL_SERVICE_TOKEN } from '@/di';
import { TArticle, TGetArticlesQueryParams } from '@/schemas/articles';

@singleton()
export class ArticlesController {
  constructor(@inject(EXTERNAL_SERVICE_TOKEN.MONGO_MODEL) private readonly _model: IArticleModel) {}

  @log()
  public async getArticles(query: TGetArticlesQueryParams): Promise<TArticle[]> {
    const { author, title, tags } = query;

    const mongoQuery: FilterQuery<TArticle> = {};

    if (author) {
      mongoQuery['author'] = author;
    }

    if (title) {
      mongoQuery['title'] = title;
    }

    if (tags) {
      mongoQuery['tags'] = { $in: tags };
    }

    const articles = await this._model.find<TArticle>(mongoQuery);

    return articles;
  }
}
