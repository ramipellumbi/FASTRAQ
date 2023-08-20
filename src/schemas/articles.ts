import { Static, Type } from '@sinclair/typebox';

import { Schema, StringEnum } from './util';

export const TAGS = [
  'JavaScript',
  'Machine Learning',
  'Nutrition',
  'Exercise',
  'Adventure',
  'Movies',
  'Personal Finance',
  'Fashion',
] as const;

const Tag = StringEnum('Tag', TAGS);

const Article = Schema('IArticle', {
  author: Type.String(),
  title: Type.String(),
  content: Type.String(),
  tags: Type.Array(Type.Ref(Tag)),
  createdAt: Type.Date(),
  updatedAt: Type.Date(),
});

const GetArticlesQueryParams = Schema('GetArticlesQueryParams', {
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
  Tag,
  Article,
  GetArticlesQueryParams,
  GetArticlesResponse,
};
