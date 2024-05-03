import { Type } from '@sinclair/typebox';

import { TAGS } from './constants';
import { Schema, StringEnum } from '../util';

export const Tag = StringEnum('Tag', TAGS);

export const Article = Schema('Article', {
  author: Type.String(),
  title: Type.String(),
  content: Type.String(),
  tags: Type.Array(Type.Ref(Tag)),
  createdAt: Type.Date(),
  updatedAt: Type.Date(),
});

export default {
  Article,
  Tag,
};
