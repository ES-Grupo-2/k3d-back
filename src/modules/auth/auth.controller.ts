import { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema, registerSchema } from './auth.types';
import { AuthService } from './auth.service';
import { AppError } from '../../utils/errors';

export class AuthController {
  
  static async registerHandler(request: FastifyRequest, reply: FastifyReply) {
    if (request.user?.role !== 'GERENTE') {
      throw new AppError('Acesso negado', 403);
    }

    const data = registerSchema.parse(request.body);
    const result = await AuthService.register(data);
    
    return reply.status(201).send(result);
  }

  static async loginHandler(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    const result = await AuthService.login(data);

    return reply.status(200).send(result);
  }
}
