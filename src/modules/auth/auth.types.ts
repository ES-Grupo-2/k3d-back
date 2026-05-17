import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
  role: z.enum(['OPERACIONAL', 'GERENTE']).optional(), 
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  code: z.string().length(6, 'O código deve ter 6 dígitos'),
});

export const loginSchema = z.object({
  email: z.string().email('Formato de e-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
