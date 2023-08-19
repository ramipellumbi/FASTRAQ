export const DI_TOKEN = {
  AUTHENTICATION: 'authentication',
  FASTIFY: 'FastifyInstance',
  SCHEMAS: 'Schemas',
  SERVER_EXTENSION: 'ServerExtension',
  SERVICE: 'Service',
} as const;

export const EXTERNAL_SERVICE_TOKEN = {
  MONGO_MODEL: 'MongoClientModel',
} as const;
