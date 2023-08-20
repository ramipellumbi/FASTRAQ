import 'reflect-metadata';

import { clearDatabase, closeDatabase, connectDatabase } from '../db';

import { LoggerCache, LoggerFactory, TracingStorage } from '@/logger';
import { ArticleModel, ArticlesController } from '@/mongodb';
import { TypedRequest } from '@/server';
import { ArticlesService } from '@/services';

// Can either test controller directly or test service that uses controller

describe('ArticlesController', () => {
  let articlesController: ArticlesController;
  let loggerFactory: LoggerFactory;
  let articlesService: ArticlesService;

  beforeAll(async () => {
    await connectDatabase();
    const article1 = new ArticleModel({
      author: 'author1',
      title: 'title1',
      content: 'content1',
      tags: ['JavaScript', 'Machine Learning'],
    });
    await article1.save();
    const article2 = new ArticleModel({
      author: 'author2',
      title: 'title2',
      content: 'content2',
      tags: ['Nutrition', 'Exercise'],
    });
    await article2.save();
    const article3 = new ArticleModel({
      author: 'author1',
      title: 'title3',
      content: 'content3',
      tags: ['Nutrition', 'Exercise'],
    });
    await article3.save();

    const tracingStorage = new TracingStorage();
    const loggerCache = new LoggerCache(tracingStorage);
    loggerFactory = new LoggerFactory(loggerCache, tracingStorage);
    articlesController = new ArticlesController(ArticleModel);
  });

  afterAll(async () => {
    await clearDatabase();
    await closeDatabase();
  });

  describe('getArticles', () => {
    beforeEach(async () => {
      articlesService = new ArticlesService(articlesController, loggerFactory);
    });

    it('should return authors that match the filter conditions', async () => {
      const { articles } = await articlesService.getArticles({
        query: { author: 'author1' },
      } as TypedRequest<{ query: 'GetArticlesQueryParams'; response: 'GetArticlesResponse' }>);

      expect(articles.length).toEqual(2);
      articles.forEach((article) => {
        expect(article.author).toEqual('author1');
      });

      expect(articles[0].title).toEqual('title1');
      expect(articles[0].content).toEqual('content1');
      expect(articles[0].tags).toEqual(['JavaScript', 'Machine Learning']);

      expect(articles[1].title).toEqual('title3');
      expect(articles[1].content).toEqual('content3');
      expect(articles[1].tags).toEqual(['Nutrition', 'Exercise']);
    });
  });
});
