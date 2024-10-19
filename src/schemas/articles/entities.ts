import { Type } from "@sinclair/typebox";

import { Schema, StringEnum } from "../util";
import { TAGS } from "./constants";

const DatabaseDate = Type.Unsafe<Date>({
  type: "string",
  format: "date-time",
});

export const Tag = StringEnum("Tag", TAGS);

export const Article = Schema("Article", {
  author: Type.String(),
  title: Type.String(),
  content: Type.String(),
  tags: Type.Array(Type.Ref(Tag)),
  createdAt: DatabaseDate,
  updatedAt: DatabaseDate,
});

export default {
  Article,
  Tag,
};
