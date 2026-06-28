import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

export const createClientSchema = z.object({
  name:  z.string().trim().min(1, "O nome é obrigatório"),
  phone: z.string().trim().min(1, "O telefone é obrigatório"),
  email: z.string().email("Formato de e-mail inválido").optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQueryInput = z.infer<typeof listClientsQuerySchema>;