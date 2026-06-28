import { z } from "zod";

export const createOrderSchema = z.object({
  title: z.string().trim().min(1, "O título do pedido é obrigatório"),
  archive: z.string().trim().optional(),
  price: z.coerce.number().positive("O preço deve ser um valor maior que zero"),
  amount_paid: z.coerce.number().nonnegative("O valor pago não pode ser negativo"),
  quantity: z.coerce.number().int().positive("A quantidade deve ser um número inteiro maior que zero"),
  tagType: z.string().trim().min(1, "O tipo de filamento (Tag) é obrigatório"),
  cost: z.coerce.number().nonnegative("O custo não pode ser negativo").optional(),
  payment_method: z.string().trim().optional(),
  client_id: z.coerce.number().int().positive().optional(),
  section: z.enum(["PENDENTE", "FAZENDO", "FINALIZADO"]).optional(),
  status: z.string().trim().optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export const moveOrderSchema = z.object({
  destinationSection: z.enum(["PENDENTE", "FAZENDO", "FINALIZADO"], {
    errorMap: () => ({ message: "Seção de destino inválida no Kanban" }),
  }),
});

export const getOrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),

  title: z.string().trim().optional().or(z.literal("")),
  section: z.enum(["PENDENTE", "FAZENDO", "FINALIZADO"]).optional().or(z.literal("")),
  status: z.string().trim().optional().or(z.literal("")),
  machine: z.string().trim().optional().or(z.literal("")),
  client_id: z.coerce.number().int().positive().optional(),
  tagType: z.string().trim().optional().or(z.literal("")),
  quantity: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().positive().optional(),
});


export type GetOrderQueryInput = z.infer<typeof getOrderQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type MoveOrderInput = z.infer<typeof moveOrderSchema>;