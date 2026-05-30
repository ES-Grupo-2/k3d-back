import { FastifyInstance } from "fastify";
import { ClientsController } from "./clients.controller";
import { verifyJWT }  from "../../middlewares/auth";
import { checkRole }  from "../../middlewares/rbac";

export async function clientsRoutes(app: FastifyInstance) {

  app.addHook("preHandler", verifyJWT);

  app.get(
    "/",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.list
  );

  app.get(
    "/with-orders",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.listWithOrders
  );

  app.get(
    "/:id",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.getOne
  );

  app.get(
    "/:id/with-orders",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.getOneWithOrders
  );

  app.post(
    "/",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.create
  );

  app.patch(
    "/:id",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.update
  );

  app.delete(
    "/:id",
    { preHandler: [checkRole(["OPERACIONAL","GERENTE"])] },
    ClientsController.delete
  );
}