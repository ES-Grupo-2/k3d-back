import { z } from "zod";

export const taskStatusSchema = z.enum(["PENDENTE", "FAZENDO", "FINALIZADO"]);

export const kanbanSectionParamsSchema = z.object({
  taskStatus: taskStatusSchema,
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type KanbanSectionParams = z.infer<typeof kanbanSectionParamsSchema>;
