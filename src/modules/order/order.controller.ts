import { FastifyRequest, FastifyReply } from "fastify";
import { OrderService } from "./order.service";
import { createOrderSchema, updateOrderSchema, moveOrderSchema, getOrderQuerySchema } from "./order.types";

const orderService = new OrderService();

export class OrderController {

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const data = createOrderSchema.parse(request.body);
            
            const newOrder = await orderService.createOrder(data);
            return reply.status(201).send(newOrder);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }
    
    async move(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const orderId = Number(id);

            if (isNaN(orderId)) {
                return reply.status(400).send({ error: "ID do pedido inválido." });
            }

            const { destinationSection } = moveOrderSchema.parse(request.body);

            const movedOrder = await orderService.moveOrder(orderId, destinationSection);
            return reply.status(200).send(movedOrder);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }

    async update(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const orderId = Number(id);

            if (isNaN(orderId)) {
                return reply.status(400).send({ error: "ID do pedido inválido." });
            }

            // MUDANÇA AQUI: Valida apenas os campos enviados no PUT usando o esquema parcial
            const data = updateOrderSchema.parse(request.body);

            const updatedOrder = await orderService.updateOrder(orderId, data);
            return reply.status(200).send(updatedOrder);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const orderId = Number(id);

            if (isNaN(orderId)) {
                return reply.status(400).send({ error: "ID do pedido inválido." });
            }

            const result = await orderService.deleteOrder(orderId);
            return reply.status(200).send(result);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }

    async get(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { page, pageSize, ...filters } = getOrderQuerySchema.parse(request.query);            
            const orders = await orderService.getOrders(page, pageSize, filters);
            return reply.status(200).send(orders);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }
}