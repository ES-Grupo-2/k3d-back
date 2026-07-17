import { prisma }            from "../../lib/clientPrisma";
import { AppError }          from "../../utils/errors";
import { CreateClientInput, UpdateClientInput } from "./clients.types";

export class ClientsService {

    static async list(search?: string) {
        return prisma.client.findMany({
        where: search
            ? {
                name: {
                contains: search,
                mode: "insensitive",
                },
            }
            : undefined,

        orderBy: {
            name: "asc",
        },
        });
    }

    static async listWithOrders(search?: string) {
        return prisma.client.findMany({
            where: search
                ? {
                    name: {
                    contains: search,
                    mode: "insensitive",
                    },
                }
                : undefined,

                include: {
                    orders: true,
                },

                orderBy: {
                    name: "asc",
                },
            });
  }
  
    static async getById(id: number) {
        const client = await prisma.client.findUnique({
            where: { id },
            }
        );

        if (!client) {
            throw new AppError("Cliente não encontrado", 404);
        }
        return client;
  }

    static async getByIdWithOrders(id: number) {
        const client = await prisma.client.findUnique({
            where: { id },

            include: {
                orders: true,
            },
        });

        if (!client) {
            throw new AppError("Cliente não encontrado", 404);
        }
        return client;
    }

  static async create(data: CreateClientInput) {
        if (data.phone) {
            const existing = await prisma.client.findFirst({
                where: { phone: data.phone }
            });
            if (existing) {
                throw new AppError("Já existe um cliente cadastrado com este telefone.", 409);
            }
        }
        return prisma.client.create({ data });
    }

  static async update(id: number, data: UpdateClientInput) {
        await ClientsService.getById(id);
        return prisma.client.update({
            where: { id },
            data,
            });
        }

  static async delete(id: number) {
        const client = await ClientsService.getByIdWithOrders(id);
        if (client.orders.length > 0) {
            throw new AppError(
            "Não é possível remover um cliente com pedidos vinculados",
            400
            );
        }
        await prisma.client.delete({
            where: { id },
        });
        return {
            message: "Cliente removido com sucesso",
        };
  }
}