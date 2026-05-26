import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "O nome é obrigatório"),
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
  role: z.enum(["OPERACIONAL", "GERENTE"]),
});

export const loginSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
