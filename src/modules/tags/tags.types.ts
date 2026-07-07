import { z } from "zod";

export const createTagSchema = z.object({
  type: z
    .string({ required_error: "O tipo da tag é obrigatório" })
    .trim()
    .min(1, "O tipo da tag não pode ser vazio")
    .max(50, "O tipo da tag deve ter no máximo 50 caracteres"),
});

export const updateTagSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, "O tipo da tag não pode ser vazio")
    .max(50, "O tipo da tag deve ter no máximo 50 caracteres")
    .optional(),
});

export const tagIdParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: "O id deve ser um número" }).int().positive(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagIdParam = z.infer<typeof tagIdParamSchema>;

export type TagResponse = {
  id: number;
  type: string;
};
