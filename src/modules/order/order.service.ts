import { prisma } from "../../lib/clientPrisma";

export class OrderService{

    async createOrder(data: any) {
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
      user_id: data.user_id,
      created_at: new Date(),
      updated_at: new Date(),
      section: data.section || 'PENDENTE', 
      status: data.status || 'AGUARDANDO_IMPRESSAO'
    }
  });

  return newOrder;
}

async moveOrder(id: number, destinationSection: 'PENDENTE' | 'FAZENDO' | 'FINALIZADO') {
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

  async updateOrder(id: number, data: any) {
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
}