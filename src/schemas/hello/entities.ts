import { Type } from "@sinclair/typebox";

import { Schema, StringEnum } from "../util";

const DatabaseDate = Type.Unsafe<Date>({
  type: "string",
  format: "date-time",
});

// purely illustrative of using the provided utils -- not used in the hello service
export const Tag = StringEnum("Tag", ["JavaScript", "TypeScript", "Node.js"] as const);

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
