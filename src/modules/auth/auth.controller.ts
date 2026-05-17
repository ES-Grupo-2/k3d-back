import { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema, registerSchema, verifyEmailSchema } from './auth.types';
import { AuthService } from './auth.service';

export class AuthController {
  
  static async registerHandler(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);
    const result = await AuthService.register(data);
    
    return reply.status(201).send(result);
  }

  static async verifyEmailHandler(request: FastifyRequest, reply: FastifyReply) {
    const data = verifyEmailSchema.parse(request.body);
    const result = await AuthService.verifyEmail(data);
    
    return reply.status(200).send(result);
  }

  static async loginHandler(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    const result = await AuthService.login(data);

    return reply.status(200).send(result);
  }
}
