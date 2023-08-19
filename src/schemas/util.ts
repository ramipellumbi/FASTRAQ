import { TProperties, Type } from '@sinclair/typebox';

export const Schema = <T extends TProperties>(id: string, schema: T) =>
  Type.Object(schema, { $id: id });

export const StringEnum = <T extends readonly string[]>(id: string, values: T) =>
  Type.Unsafe<T[number]>({ type: 'string', enum: values, $id: id });
