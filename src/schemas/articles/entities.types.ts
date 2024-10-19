import { Static } from "@sinclair/typebox";

import { Article, Tag } from "./entities";

export type TArticle = Static<typeof Article>;
export type TTag = Static<typeof Tag>;
