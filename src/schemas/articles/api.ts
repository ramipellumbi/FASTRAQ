import { Type } from '@sinclair/typebox';

import { Article, Tag } from './entities';
import { Schema } from '../util';

export const GetArticlesQueryParams = Schema('GetArticlesQueryParams', {
  author: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.Ref(Tag))),
});

export const GetArticlesResponse = Schema('GetArticlesResponse', {
  articles: Type.Array(Type.Ref(Article)),
});

export default {
  GetArticlesQueryParams,
  GetArticlesResponse,
};
