import { FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, verifyEmailSchema } from './auth.types';
import { AuthService } from './auth.service';

export class AuthController {
  
  static async registerHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = registerSchema.parse(request.body);
      
      const result = await AuthService.register(data);
      
      return reply.status(201).send(result);
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  static async verifyEmailHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = verifyEmailSchema.parse(request.body);
      const result = await AuthService.verifyEmail(data);
      
      return reply.status(200).send(result);
      
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.errors });
      }
      return reply.status(400).send({ error: error.message });
    }
  }
}