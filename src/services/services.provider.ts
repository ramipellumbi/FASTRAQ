import { container } from 'tsyringe';

import { ArticlesService } from './articles.service';

import { DI_TOKEN } from '@/di';

export const bootstrapServices = () => {
  container.registerSingleton<ArticlesService>(DI_TOKEN.SERVICE, ArticlesService);
};
