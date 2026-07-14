import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";
import { checkRole } from "../../src/middlewares/rbac";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const userRepository = vi.mocked(prisma.user);

const baseUser = {
  id: 1,
  name: "Test User",
  email: "user@email.com",
  password_hash: "",
  role: "OPERACIONAL",
  created_at: new Date(),
  updated_at: new Date(),
};

function authToken(role: "GERENTE" | "OPERACIONAL" = "GERENTE") {
  return jwt.sign(
    {
      sub: "99",
      email: "manager@email.com",
      role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
}

async function injectPost(
  url: string,
  payload: unknown,
  token?: string,
) {

  const app = buildApp({ logger: false });

  try {
    return await app.inject({
      method: "POST",
      url,
      payload,
      headers: token
        ? {
            authorization: `Bearer ${token}`,
          }
        : undefined,
    });

  } finally {
    await app.close();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth routes", () => {
  describe("POST /auth/register", () => {
    it("returns 201 and creates a user", async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        ...baseUser,
        id: 10,
        name: "New User",
        email: "new@email.com",
        role: "GERENTE",
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "New User",
          email: "new@email.com",
          password: "password123",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        user: {
          id: 10,
          name: "New User",
          email: "new@email.com",
          role: "GERENTE",
        },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "New User",
          email: "new@email.com",
          role: "GERENTE",
        }),
      });
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await injectPost("/auth/register", {
        name: "New User",
        email: "new@email.com",
        password: "password123",
        role: "OPERACIONAL",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "Token não informado",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
    });

    it("returns 401 when authorization token is invalid", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "New User",
          email: "new@email.com",
          password: "password123",
          role: "OPERACIONAL",
        },
        "invalid-token",
      );

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "Token inválido",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
    });

    it("returns 403 when user role cannot register users", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "New User",
          email: "new@email.com",
          password: "password123",
          role: "OPERACIONAL",
        },
        authToken("OPERACIONAL"),
      );

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({
        error: "Acesso negado",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid body", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          email: "invalid-email",
          password: "short",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
    });

    it("returns 400 when role is missing", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "New User",
          email: "new@email.com",
          password: "password123",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
    });

    it("returns 409 for duplicated email", async () => {
      userRepository.findUnique.mockResolvedValue(baseUser);

      const response = await injectPost(
        "/auth/register",
        {
          name: "Test User",
          email: "user@email.com",
          password: "password123",
          role: "OPERACIONAL",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({
        error: "E-mail já cadastrado!",
      });
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("POST /verify", () => {
    it("returns 404 because email verification is no longer exposed", async () => {
      const response = await injectPost("/verify", {
        email: "user@email.com",
        code: "123456",
      });

      expect(response.statusCode).toBe(404);
      expect(userRepository.findUnique).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /auth/login", () => {
    it("returns 200, a JWT token, and user data for valid credentials", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        password_hash: passwordHash,
      });

      const response = await injectPost("/auth/login", {
        email: "user@email.com",
        password: "password123",
      });
      const body = response.json();
      const decoded = jwt.verify(body.token, "test-secret");

      expect(response.statusCode).toBe(200);
      expect(body).toMatchObject({
        token: expect.any(String),
        user: {
          id: 1,
          name: "Test User",
          email: "user@email.com",
          role: "OPERACIONAL",
        },
      });
      expect(body.user).not.toHaveProperty("isVerified");
      expect(typeof body.token).toBe("string");
      expect(decoded).toMatchObject({
        sub: "1",
        email: "user@email.com",
        role: "OPERACIONAL",
      });
    });

    it("returns 401 for unknown user", async () => {
      userRepository.findUnique.mockResolvedValue(null);

      const response = await injectPost("/auth/login", {
        email: "missing@email.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "Credenciais inválidas",
      });
    });

    it("returns 401 for wrong password", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        password_hash: passwordHash,
      });

      const response = await injectPost("/auth/login", {
        email: "user@email.com",
        password: "wrong-password",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "Credenciais inválidas",
      });
    });

    it("returns 400 for invalid body", async () => {
      const response = await injectPost("/auth/login", {
        email: "invalid-email",
        password: "",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
    });

    it("returns 500 when an unexpected error occurs", async () => {
      userRepository.findUnique.mockRejectedValue(new Error("DB connection lost"));

      const response = await injectPost("/auth/login", {
        email: "user@email.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: "Erro interno do servidor",
      });
    });

    it("returns 500 when JWT_SECRET is not configured", async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const passwordHash = await bcrypt.hash("password123", 10);
      userRepository.findUnique.mockResolvedValue({
        ...baseUser,
        password_hash: passwordHash,
      });

      const response = await injectPost("/auth/login", {
        email: "user@email.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: "Erro interno do servidor",
      });

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe("POST /auth/register with missing JWT_SECRET", () => {
    it("returns 500 when JWT_SECRET is not configured", async () => {
      const token = jwt.sign(
        { sub: "99", email: "manager@email.com", role: "GERENTE" },
        "test-secret",
        { expiresIn: "8h" },
      );

      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const response = await injectPost(
        "/auth/register",
        {
          name: "New User",
          email: "new@email.com",
          password: "password123",
          role: "GERENTE",
        },
        token,
      );

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({
        error: "Erro interno do servidor",
      });

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe("rbac middleware", () => {
    it("throws 401 when request.user is not set", async () => {
      const roleGuard = checkRole(["GERENTE"]);
      const mockRequest = { user: undefined } as any;
      const mockReply = {} as any;

      await expect(roleGuard(mockRequest, mockReply)).rejects.toThrow(
        "Token não informado",
      );
    });
  });
});
