import { Prisma } from "../../generated/prisma";
import { prisma } from "../../lib/clientPrisma";
import {GetOrderQueryInput, CreateOrderInput, UpdateOrderInput, MoveOrderInput} from "./order.types";
import { paginatePrisma } from "../../utils/pagination";

export class OrderService{

    async createOrder(data: CreateOrderInput) {
  const newOrder = await prisma.order.create({
    data: {
      title: data.title,
      tagType: data.tagType,
      archive: data.archive,
      price: data.price,
      amount_paid: data.amount_paid,
      quantity: data.quantity,
      payment_method: data.payment_method,
      cost: data.cost,
      clientId: data.client_id,
      created_at: new Date(),
      updated_at: new Date(),
      section: data.section || 'PENDENTE', 
      status: data.status || 'NAOPAGO'
    }
  });

  return newOrder;
}

async moveOrder(id: number, destinationSection: MoveOrderInput["destinationSection"]) {
      const currentOrder = await prisma.order.findUnique({
      where: { id: id }
    });

    if (!currentOrder) {
      throw new Error('Pedido não encontrado.');
    }

    const movedOrder = await prisma.order.update({
      where: { id: id },
      data: { section: destinationSection }
    });

    return movedOrder;
  }

  async deleteOrder(id: number) {
    const orderExists = await prisma.order.findUnique({
      where: { id: id }
    });

    if (!orderExists) {
      throw new Error('Pedido não encontrado.');
    }

    await prisma.order.delete({
      where: { id: id }
    });

    return { message: 'Pedido removido com sucesso do Kanban.' };
  }

async updateOrder(id: number, data: UpdateOrderInput) {
    const currentOrder = await prisma.order.findUnique({
    where: { id: id }
  });

  if (!currentOrder) {
    throw new Error('Pedido não encontrado.');
  }

  

  const updatedOrder = await prisma.order.update({
    where: { id: id },
    data: {
      title: data.title,
      tagType: data.tagType,
      archive: data.archive,
      clientId: data.client_id,
      price: data.price,
      amount_paid: data.amount_paid,
      quantity: data.quantity,
      payment_method: data.payment_method,
      cost: data.cost,
      status: data.status,
      section: data.section,
      updated_at: new Date()}
  });

  return updatedOrder;
}
  

async getOrders(
  page: number = 1, 
  pageSize: number = 10, 
  filters: Omit<GetOrderQueryInput, "page" | "pageSize"> = {}
){
    const where = this.compileFilters(filters);

    return paginatePrisma(
      prisma.order,
      {
        where,
        orderBy: { created_at: 'desc' },
        include: { client: true, tag: true }
      },
      { page, pageSize }
    );
  }


  private compileFilters(filters: Record<string, any>): Prisma.OrderWhereInput {
    const compiledWhere: Record<string, any> = {};

    const fieldsDefinition = Prisma.dmmf.datamodel.models.find(
      (m) => m.name === 'Order'
    )?.fields;

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      const prismaField = key === 'client_id' ? 'clientId' : key;
      const fieldInfo = fieldsDefinition?.find((f) => f.name === prismaField);
      if (!fieldInfo) return;

      const strategy: Record<string, () => void> = {
        String: () => {
          compiledWhere[prismaField] = prismaField === 'title'
            ? { contains: value, mode: 'insensitive' }
            : value;
        },
        Int:     () => { compiledWhere[prismaField] = Number(value); },
        Float:   () => { compiledWhere[prismaField] = Number(value); },
        Boolean: () => { compiledWhere[prismaField] = value === 'true' || value === true; },
        enum:    () => { compiledWhere[prismaField] = value; }
      };

      const execute = strategy[fieldInfo.type] || strategy[fieldInfo.kind];
      if (execute) execute();
    });

    return compiledWhere as Prisma.OrderWhereInput;
  }

}
