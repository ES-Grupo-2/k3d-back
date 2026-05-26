import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from './order.service';

const orderService = new OrderService();

export class OrderController {

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
        const data = request.body;
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

        const { destinationSection } = request.body as { destinationSection: 'PENDENTE' | 'FAZENDO' | 'FINALIZADO' };

        if (isNaN(orderId)) {
            return reply.status(400).send({ error: 'ID do pedido inválido.' });
        }

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
        const data = request.body;

        if (isNaN(orderId)) {
            return reply.status(400).send({ error: 'ID do pedido inválido.' });
        }

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
            return reply.status(400).send({ error: 'ID do pedido inválido.' });
        }

        const result = await orderService.deleteOrder(orderId);
        return reply.status(200).send(result);
        } catch (error: any) {
        return reply.status(400).send({ error: error.message });
        }
    }

    async get(request: FastifyRequest, reply: FastifyReply) {
        try {
        const { page, limit, ...filters } = request.query as any;
        const orders = await orderService.getOrders(Number(page) || 1, Number(limit) || 10, filters);
        return reply.status(200).send(orders);
        } catch (error: any) {
        return reply.status(400).send({ error: error.message });
        }
    }
}