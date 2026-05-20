import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../utils/errors';
import { UserRole } from './auth';

export function checkRole(requiredRole: UserRole) {
  return async function roleGuard(request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) {
      throw new AppError('Token não informado', 401);
    }

    if (request.user.role !== requiredRole) {
      throw new AppError('Acesso negado', 403);
    }
  };
}
