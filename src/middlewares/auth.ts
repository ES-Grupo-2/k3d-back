import { FastifyReply, FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export type UserRole = 'OPERACIONAL' | 'GERENTE';

export type AuthenticatedUser = {
  id: number;
  email: string;
  role: UserRole;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

function isUserRole(role: unknown): role is UserRole {
  return role === 'OPERACIONAL' || role === 'GERENTE';
}

export async function verifyJWT(request: FastifyRequest, _reply: FastifyReply) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError('Token não informado', 401);
  }

  const token = authorization.replace('Bearer ', '').trim();
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload & {
      email?: unknown;
      role?: unknown;
    };

    const userId = Number(decoded.sub);
    if (!decoded.sub || Number.isNaN(userId) || typeof decoded.email !== 'string' || !isUserRole(decoded.role)) {
      throw new AppError('Token inválido', 401);
    }

    request.user = {
      id: userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Token inválido', 401);
  }
}
