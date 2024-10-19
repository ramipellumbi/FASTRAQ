import hello from "./hello";

const schemas = {
  ...hello,
};

export type TSchemas = typeof schemas;
export default schemas;
