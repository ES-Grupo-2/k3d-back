import { prisma } from "../../lib/clientPrisma";
import { TaskStatus } from "./kanban.types";

type OrderRepository = {
  order: {
    findMany(args: {
      where: { section: TaskStatus };
      include: { tag: true; client: true };
      orderBy: { updated_at: "desc" };
    }): Promise<unknown[]>;
  };
};

export class KanbanService {
  static async listTasksBySection(taskStatus: TaskStatus) {
    const orderRepository = (prisma as unknown as OrderRepository).order;
    const tasks = await orderRepository.findMany({
      where: {
        section: taskStatus,
      },
      include: {
        tag: true,
        client: true,
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    return {
      taskStatus,
      tasks,
    };
  }
}
