import { Static, Type } from '@sinclair/typebox';

import { Schema, StringEnum } from './util';

const Tag = StringEnum('Tag', [
  'JavaScript',
  'Machine Learning',
  'Nutrition',
  'Exercise',
  'Adventure',
  'Movies',
  'Personal Finance',
  'Fashion',
] as const);

const Article = Schema('IArticle', {
  author: Type.String(),
  title: Type.String(),
  content: Type.String(),
  tags: Type.Array(Type.Ref(Tag)),
  createdAt: Type.Date(),
  updatedAt: Type.Date(),
});

const GetArticlesQueryParams = Schema('GetDogsQueryParams', {
  author: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.Ref(Tag))),
});
const GetArticlesResponse = Schema('GetArticlesResponse', {
  articles: Type.Array(Type.Ref(Article)),
});

export type GetArticlesQueryParams = Static<typeof GetArticlesQueryParams>;

export type Tag = Static<typeof Tag>;
export type IArticle = Static<typeof Article>;

export default {
  GetArticlesQueryParams,
  GetArticlesResponse,
};
