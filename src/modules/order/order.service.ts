import { OrderStatus } from '../../generated/prisma';
import { prisma } from "../../lib/clientPrisma";

export class OrderService{

    async createOrder(data: any) {
  const newOrder = await prisma.order.create({
    data: {
      title: data.title,
      tagType: data.tagType,
      archive3d: data.archive3d,
      price: data.price,
      amount_paid: data.amount_paid,
      quantity: data.quantity,
      payment_method: data.payment_method,
      cost: data.cost,
      link: data.link,
      machine: data.machine,
      userId: data.userId,
      clientId: data.clientId,

      section: data.section || 'PENDING', 
      status: data.status || 'WAITING_PRINTING'
    }
  });

  return newOrder;
}

async moveOrder(id: number, destinationSection: 'PENDING' | 'DOING' | 'DONE') {
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


}