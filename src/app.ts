import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import fastify, { FastifyServerOptions } from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";
import { clientsRoutes } from "./modules/client/clients.routes";
import { kanbanRoutes } from "./modules/kanban/kanban.routes";
import { orderRoutes } from "./modules/order/order.routes";
import { errorHandler } from "./utils/errors";
import { tagsRoutes }       from "./modules/tags/tags.routes";
import { dashboardRoutes }  from "./modules/dashboard/dashboard.routes";
import { calculatorRoutes } from "./modules/calculator/calculator.routes";
import { filesRoutes } from "./modules/files/files.routes";

export function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = fastify(options);

  // Libera o front (produção e dev local) a chamar a API pelo navegador.
  app.register(cors, {
    origin: ["https://k3d.eyepleasure.com.br", "http://localhost:3000"],
  });

  app.setErrorHandler(errorHandler);
  app.register(multipart);
  app.register(orderRoutes, { prefix: "" });
  app.register(authRoutes, { prefix: "/auth" });
  app.register(kanbanRoutes, { prefix: "/kanban" });
  app.register(clientsRoutes, { prefix: "/clients" });
  app.register(tagsRoutes,       { prefix: "/tags" });
  app.register(dashboardRoutes,  { prefix: "/dashboard" });
  app.register(calculatorRoutes, { prefix: "/calculator" });
  app.register(filesRoutes, { prefix: "/files" });

  return app;
}
