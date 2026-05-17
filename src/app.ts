import fastify, { FastifyServerOptions } from 'fastify';
import { authRoutes } from './modules/auth/auth.routes';
import { errorHandler } from './utils/errors';

export function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = fastify(options);

  app.setErrorHandler(errorHandler);
  app.register(authRoutes);

  return app;
}
