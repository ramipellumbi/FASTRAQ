import articles from './articles';

const schemas = {
  ...articles,
};

export type TSchemas = typeof schemas;
export default schemas;
