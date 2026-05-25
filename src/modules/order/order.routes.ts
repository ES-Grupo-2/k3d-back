import { FastifyInstance } from "fastify";
import { OrderController } from "./order.controller";
import { verifyJWT } from "../../middlewares/auth";

const orderController = new OrderController();

export async function orderRoutes(app: FastifyInstance) {
    app.post(
        "/orders",
        { preHandler: [verifyJWT] },
        orderController.create
    );
    
    app.put(
        "/orders/:id",
        { preHandler: [verifyJWT] },
        orderController.update
    );

    app.patch(
        "/orders/:id/move",
        { preHandler: [verifyJWT] },
        orderController.move
    );

    app.delete(
        "/orders/:id",
        { preHandler: [verifyJWT] },
        orderController.delete
    );
}