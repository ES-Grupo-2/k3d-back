import { prisma }            from "../../lib/clientPrisma";
import { AppError }          from "../../utils/errors";
import { CreateClientInput, UpdateClientInput } from "./clients.types";
import { paginatePrisma } from "../../utils/pagination";

export class ClientsService {

    static async list(page: number = 1, pageSize: number = 10, search?: string) {
        return paginatePrisma(
            prisma.client,
            {
                where: search
                    ? {
                        name: {
                        contains: search,
                        mode: "insensitive" as const,
                        },
                    }
                    : undefined,
                orderBy: {
                    name: "asc" as const,
                },
            },
            { page, pageSize }
        );
    }

    static async listWithOrders(page: number = 1, pageSize: number = 10, search?: string) {
        const paginatedResult = await paginatePrisma(
            prisma.client,
            {
                where: search
                    ? {
                        name: {
                        contains: search,
                        mode: "insensitive" as const,
                        },
                    }
                    : undefined,
                include: {
                    _count: {
                        select: {
                            orders: true,
                        },
                    },
                },
                orderBy: {
                    name: "asc" as const,
                },
            },
            { page, pageSize }
        );

        return {
            ...paginatedResult,
            data: paginatedResult.data.map((client: any) => ({
                id: client.id,
                name: client.name,
                phone: client.phone,
                email: client.email,
                ordersCount: client._count?.orders ?? 0,
            })),
        };
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
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        orders: true,
                    },
                },
            },
        });

        if (!client) {
            throw new AppError("Cliente não encontrado", 404);
        }

        if (client._count.orders > 0) {
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