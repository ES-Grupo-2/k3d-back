import { FastifyRequest, FastifyReply } from "fastify";
import { createClientSchema, updateClientSchema } from "./clients.types";
import { ClientsService } from "./clients.service";

export class ClientsController {
    
    static async list(request: FastifyRequest, reply: FastifyReply) {
        const { search } = request.query as { search?: string };
        const clients = await ClientsService.list(search);
        return reply.send(clients);
    }
    static async listWithOrders(
        request: FastifyRequest,
        reply: FastifyReply
        ) {
        const { search } = request.query as {
            search?: string;
        };
        const clients = await ClientsService.listWithOrders(search);

        return reply.send(clients);
    }

    static async getOne(
        request: FastifyRequest,
        reply: FastifyReply) {

        const { id } = request.params as { id: string };
        const client = await ClientsService.getById(Number(id));

        return reply.send(client);
    }
    
    static async getOneWithOrders(
        request: FastifyRequest,
        reply: FastifyReply
        ) {

        const { id } = request.params as {
            id: string;
        };

        const client = await ClientsService.getByIdWithOrders(Number(id));

        return reply.send(client);
    }
    static async create(request: FastifyRequest, reply: FastifyReply) {
        const data = createClientSchema.parse(request.body);
        const client = await ClientsService.create(data);
        return reply.status(201).send(client);
    }
    static async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const data = updateClientSchema.parse(request.body);
        const client = await ClientsService.update(Number(id), data);
        return reply.send(client);
    }
    static async delete(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const result = await ClientsService.delete(Number(id));
        return reply.send(result);
    }
}