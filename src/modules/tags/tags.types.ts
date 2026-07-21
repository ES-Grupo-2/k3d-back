import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um hex válido (ex: #6366f1)")
  .optional();

export const createTagSchema = z.object({
  type: z
    .string({ required_error: "O tipo da tag é obrigatório" })
    .trim()
    .min(1, "O tipo da tag não pode ser vazio")
    .max(50, "O tipo da tag deve ter no máximo 50 caracteres"),
  color: hexColor,
});

export const updateTagSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, "O tipo da tag não pode ser vazio")
    .max(50, "O tipo da tag deve ter no máximo 50 caracteres")
    .optional(),
  color: hexColor,
});

export const tagIdParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: "O id deve ser um número" }).int().positive(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagIdParam    = z.infer<typeof tagIdParamSchema>;

export type TagResponse = {
  id:    number;
  type:  string;
  color: string;
};