import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/lib/clientPrisma';
import { sendVerificationEmail } from '../../src/utils/email';

vi.mock('../../src/lib/clientPrisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../src/utils/email', () => ({
  sendVerificationEmail: vi.fn(),
}));

const userRepository = vi.mocked(prisma.user);
const mockedSendVerificationEmail = vi.mocked(sendVerificationEmail);

const baseUser = {
  id: 1,
  email: 'user@email.com',
  password_hash: '',
  role: 'OPERACIONAL',
  is_verified: true,
  verification_code: '123456',
  verification_expires_at: new Date(Date.now() + 15 * 60 * 1000),
  created_at: new Date(),
  updated_at: new Date(),
};

async function injectPost(url: string, payload: unknown) {
  const app = buildApp({ logger: false });

  try {
    return await app.inject({
      method: 'POST',
      url,
      payload,
    });
  } finally {
    await app.close();
  }
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '8h';
  vi.clearAllMocks();
  mockedSendVerificationEmail.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth routes', () => {
  describe('POST /register', () => {
    it('returns 201 and creates a user', async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        ...baseUser,
        id: 10,
        email: 'new@email.com',
        is_verified: false,
      });

      const response = await injectPost('/register', {
        email: 'new@email.com',
        password: 'password123',
        role: 'OPERACIONAL',
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        message: 'Usuário criado com sucesso!',
        userId: 10,
      });
      expect(mockedSendVerificationEmail).toHaveBeenCalledWith(
        'new@email.com',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(userRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@email.com',
          role: 'OPERACIONAL',
          is_verified: false,
          verification_code: expect.stringMatching(/^\d{6}$/),
        }),
      });
    });

    it('returns 400 for invalid body', async () => {
      const response = await injectPost('/register', {
        email: 'invalid-email',
        password: 'short',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: 'Dados inválidos',
      });
    });

    it('returns 409 for duplicated email', async () => {
      userRepository.findUnique.mockResolvedValue(baseUser);

      const response = await injectPost('/register', {
        email: 'user@email.com',
        password: 'password123',
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: 'E-mail já cadastrado!',
      });
      expect(mockedSendVerificationEmail).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('POST /verify', () => {
    it('returns 200 and verifies the user email', async () => {
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        is_verified: false,
      });
      userRepository.update.mockResolvedValue({
        ...baseUser,
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      });

      const response = await injectPost('/verify', {
        email: 'user@email.com',
        code: '123456',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: 'Conta ativada com sucesso!',
      });
      expect(userRepository.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          is_verified: true,
          verification_code: null,
          verification_expires_at: null,
        },
      });
    });

    it('returns 404 for unknown user', async () => {
      userRepository.findUnique.mockResolvedValue(null);

      const response = await injectPost('/verify', {
        email: 'missing@email.com',
        code: '123456',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({
        error: 'Usuário não encontrado',
      });
    });

    it('returns 400 for invalid code', async () => {
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        is_verified: false,
        verification_code: '654321',
      });

      const response = await injectPost('/verify', {
        email: 'user@email.com',
        code: '123456',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: 'Código inválido',
      });
    });

    it('returns 400 for expired code', async () => {
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        is_verified: false,
        verification_expires_at: new Date(Date.now() - 60 * 1000),
      });

      const response = await injectPost('/verify', {
        email: 'user@email.com',
        code: '123456',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: 'Código expirado',
      });
    });

    it('returns 409 for already verified account', async () => {
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        is_verified: true,
      });

      const response = await injectPost('/verify', {
        email: 'user@email.com',
        code: '123456',
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: 'Conta já verificada',
      });
    });
  });

  describe('POST /login', () => {
    it('returns 200, a JWT token, and user data for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        password_hash: passwordHash,
      });

      const response = await injectPost('/login', {
        email: 'user@email.com',
        password: 'password123',
      });
      const body = response.json();
      const decoded = jwt.verify(body.token, 'test-secret');

      expect(response.statusCode).toBe(200);
      expect(body).toMatchObject({
        message: 'Login realizado com sucesso!',
        user: {
          id: 1,
          email: 'user@email.com',
          role: 'OPERACIONAL',
          isVerified: true,
        },
      });
      expect(typeof body.token).toBe('string');
      expect(decoded).toMatchObject({
        sub: '1',
        email: 'user@email.com',
        role: 'OPERACIONAL',
      });
    });

    it('returns 401 for unknown user', async () => {
      userRepository.findUnique.mockResolvedValue(null);

      const response = await injectPost('/login', {
        email: 'missing@email.com',
        password: 'password123',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'Credenciais inválidas',
      });
    });

    it('returns 401 for wrong password', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        password_hash: passwordHash,
      });

      const response = await injectPost('/login', {
        email: 'user@email.com',
        password: 'wrong-password',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: 'Credenciais inválidas',
      });
    });

    it('returns 403 for unverified account', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        password_hash: passwordHash,
        is_verified: false,
      });

      const response = await injectPost('/login', {
        email: 'user@email.com',
        password: 'password123',
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: 'Conta ainda não verificada',
      });
    });

    it('returns 400 for invalid body', async () => {
      const response = await injectPost('/login', {
        email: 'invalid-email',
        password: '',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: 'Dados inválidos',
      });
    });
  });
});
