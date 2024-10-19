import { Type } from "@sinclair/typebox";

import { Schema } from "../util";
import { Tag } from "./entities";

export const GetHelloWorldQueryParams = Schema("GetHelloWorldQueryParams", {
  author: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.Ref(Tag))),
});

export const GetHelloWorldResponse = Schema("GetHelloWorldResponse", {
  hello: Type.String(),
});

export default {
  GetHelloWorldQueryParams,
  GetHelloWorldResponse,
};
