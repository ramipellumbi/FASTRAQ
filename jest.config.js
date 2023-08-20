/**@type {import('jest').Config}*/
const config = {
  preset: 'ts-jest',
  verbose: true,
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/.jest/setEnvVars.ts'],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.jsx?$': '$1',
    '^@/decorators': '<rootDir>/src/decorators.ts',
    '^@/di': '<rootDir>/src/di.ts',
    '^@/logger': '<rootDir>/src/logger',
    '^@/mongodb': '<rootDir>/src/external-services/mongodb',
    '^@/schemas': '<rootDir>/src/schemas',
    '^@/schemas/*': '<rootDir>/src/schemas/*',
    '^@/server': '<rootDir>/src/server',
    '^@/services': '<rootDir>/src/services',
  },
};

export default config;
