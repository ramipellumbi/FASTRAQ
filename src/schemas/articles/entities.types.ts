import { Static } from '@sinclair/typebox';

import { Article, Tag } from './entities';

export type TTag = Static<typeof Tag>;
export type TArticle = Static<typeof Article>;
