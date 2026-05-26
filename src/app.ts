import fastify, { FastifyServerOptions } from "fastify";
import { errorHandler } from "./utils/errors";
import { authRoutes }       from "./modules/auth/auth.routes";
// import { kanbanRoutes }     from "./modules/kanban/kanban.routes";
// import { clientsRoutes }    from "./modules/clients/clients.routes"; 
// import { tagsRoutes }       from "./modules/tags/tags.routes";
// import { uploadRoutes }     from "./modules/upload/upload.routes";
// import { dashboardRoutes }  from "./modules/dashboard/dashboard.routes";
// import { calculatorRoutes } from "./modules/calculator/calculator.routes";

export function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = fastify(options);

  app.setErrorHandler(errorHandler);
  app.register(authRoutes);

  app.register(authRoutes,       { prefix: "/auth" });
  // app.register(kanbanRoutes,     { prefix: "/kanban" });
  // app.register(clientsRoutes,    { prefix: "/clients" });
  // app.register(tagsRoutes,       { prefix: "/tags" });
  // app.register(uploadRoutes,     { prefix: "/upload" });
  // app.register(dashboardRoutes,  { prefix: "/dashboard" });
  // app.register(calculatorRoutes, { prefix: "/calculator" });

  return app;
}
