import { Prisma } from "../../generated/prisma";
import { prisma } from "../../lib/clientPrisma";
import {GetOrderQueryInput, CreateOrderInput, UpdateOrderInput, MoveOrderInput} from "./order.types";

export class OrderService{

    async createOrder(data: CreateOrderInput) {
  const newOrder = await prisma.orders.create({
    data: {
      title: data.title,
      tagType: data.tagType,
      archive: data.archive,
      price: data.price,
      amount_paid: data.amount_paid,
      quantity: data.quantity,
      payment_method: data.payment_method,
      cost: data.cost,
      link: data.link,
      machine: data.machine,
      client_id: data.client_id,
      created_at: new Date(),
      updated_at: new Date(),
      section: data.section || 'PENDENTE', 
      status: data.status || 'NAOPAGO'
    }
  });

  return newOrder;
}

async moveOrder(id: number, destinationSection: MoveOrderInput["destinationSection"]) {
      const currentOrder = await prisma.orders.findUnique({
      where: { id: id }
    });

    if (!currentOrder) {
      throw new Error('Pedido não encontrado.');
    }

    const movedOrder = await prisma.orders.update({
      where: { id: id },
      data: { section: destinationSection }
    });

    return movedOrder;
  }

  async deleteOrder(id: number) {
    const orderExists = await prisma.orders.findUnique({
      where: { id: id }
    });

    if (!orderExists) {
      throw new Error('Pedido não encontrado.');
    }

    await prisma.orders.delete({
      where: { id: id }
    });

    return { message: 'Pedido removido com sucesso do Kanban.' };
  }

async updateOrder(id: number, data: UpdateOrderInput) {
    const currentOrder = await prisma.orders.findUnique({
    where: { id: id }
  });

  if (!currentOrder) {
    throw new Error('Pedido não encontrado.');
  }

  

  const updatedOrder = await prisma.orders.update({
    where: { id: id },
    data: {
      title: data.title,
      tagType: data.tagType,
      archive: data.archive,
      client_id: data.client_id,
      price: data.price,
      amount_paid: data.amount_paid,
      quantity: data.quantity,
      payment_method: data.payment_method,
      cost: data.cost,
      link: data.link,
      machine: data.machine,
      status: data.status,
      section: data.section,
      updated_at: new Date()}
  });

  return updatedOrder;
}
  

async getOrders(
  page: number = 1, 
  limit: number = 10, 
  filters: Omit<GetOrderQueryInput, "page" | "limit"> = {}
){    const currentPage = Math.max(1, page);
    const currentLimit = Math.max(1, limit);
    const skip = (currentPage - 1) * currentLimit;

    const where = this.compileFilters(filters);

    const [orders, totalItems] = await prisma.$transaction([
      prisma.orders.findMany({
        where,
        skip,
        take: currentLimit,
        orderBy: { created_at: 'desc' },
        include: { clients: true, tags: true }
      }),
      prisma.orders.count({ where })
    ]);

    return {
      data: orders,
      meta: {
        totalItems,
        itemCount: orders.length,
        itemsPerPage: currentLimit,
        totalPages: Math.ceil(totalItems / currentLimit),
        currentPage
      }
    };
  }


  private compileFilters(filters: Record<string, any>): Prisma.ordersWhereInput {
    const compiledWhere: Record<string, any> = {};

    const fieldsDefinition = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'orders'
    )?.fields;

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      const fieldInfo = fieldsDefinition?.find((f) => f.name === key);
      if (!fieldInfo) return;

      const strategy: Record<string, () => void> = {
        String: () => {
          compiledWhere[key] = key === 'title'
            ? { contains: value, mode: 'insensitive' }
            : value;
        },
        Int:     () => { compiledWhere[key] = Number(value); },
        Float:   () => { compiledWhere[key] = Number(value); },
        Boolean: () => { compiledWhere[key] = value === 'true' || value === true; },
        enum:    () => { compiledWhere[key] = value; }
      };

      const execute = strategy[fieldInfo.type] || strategy[fieldInfo.kind];
      if (execute) execute();
    });

    return compiledWhere as Prisma.ordersWhereInput;
  }

}