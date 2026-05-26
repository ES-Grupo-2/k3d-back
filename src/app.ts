import fastify, { FastifyServerOptions } from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";
import { errorHandler } from "./utils/errors";
import { orderRoutes } from "./modules/order/order.routes";

export function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = fastify(options);

  app.setErrorHandler(errorHandler);
  app.register(authRoutes);
  app.register(orderRoutes);
  return app;
}
