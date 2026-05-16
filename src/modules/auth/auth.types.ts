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

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;