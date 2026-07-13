import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const userRepository = vi.mocked(prisma.user) as any;

const baseUser = {
  id: 100,
  name: "Beatriz Andrade Costa",
  email: "beatriz.costa@kria3d.com",
  password_hash: "hashed_password",
  role: "GERENTE",
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
      expiresIn: process.env.JWT_EXPIRES_IN as any,
    },
  );
}

async function injectPost(
  url: string,
  payload: any,
  token?: string,
): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "POST",
      url,
      payload,
      headers: token
        ? {
            authorization: `Bearer ${token}`,
          }
        : undefined,
    });
    return response as any;
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

describe("RF-01 — Criação de Usuário (Blackbox ECP)", () => {
  describe("Nome Validation", () => {
    it("TC-RF01-01 - Nome Válido - Campo preenchido com texto não vazio (Beatriz Andrade Costa)", async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 100,
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password_hash: "hashed_password",
        role: "GERENTE",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        user: {
          name: "Beatriz Andrade Costa",
        },
      });
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("TC-RF01-02 - Nome Inválido - Campo deixado em branco", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("Email Validation", () => {
    it("TC-RF01-03 - Email Válido - Formato correto e não cadastrado (beatriz.costa@kria3d.com)", async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 100,
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password_hash: "hashed_password",
        role: "GERENTE",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        user: {
          email: "beatriz.costa@kria3d.com",
        },
      });
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("TC-RF01-04 - Email Inválido (formato) - Formato incorreto (beatriz.costa@kria3d)", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d",
          password: "Kr3D#2025",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("TC-RF01-05 - Email Inválido (duplicidade) - E-mail já existente na base (admin@kria3d.com)", async () => {
      userRepository.findUnique.mockResolvedValue({
        id: 100,
        name: "Beatriz Andrade Costa",
        email: "admin@kria3d.com",
        password_hash: "hashed_password",
        role: "GERENTE",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "admin@kria3d.com",
          password: "Kr3D#2025",
          role: "GERENTE",
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

  describe("Senha / Confirmação Validation", () => {
    it("TC-RF01-06 - Senha / Confirmação Válida - Idênticas (Kr3D#2025)", async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 100,
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password_hash: "hashed_password",
        role: "GERENTE",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          confirmation: "Kr3D#2025",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(201);
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("TC-RF01-07 - Senha / Confirmação Inválida (divergência) - Diferentes", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          confirmation: "Kr3D#2026",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("TC-RF01-08 - Senha Inválida (vazia) - Campo deixado em branco", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("Perfil (role) Validation", () => {
    it("TC-RF01-09 - Perfil (role) Válido - Operacional", async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 100,
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password_hash: "hashed_password",
        role: "OPERACIONAL",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          role: "OPERACIONAL",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        user: {
          role: "OPERACIONAL",
        },
      });
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("TC-RF01-10 - Perfil (role) Válido - Gerente", async () => {
      userRepository.findUnique.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: 100,
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password_hash: "hashed_password",
        role: "GERENTE",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
          role: "GERENTE",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        user: {
          role: "GERENTE",
        },
      });
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("TC-RF01-11 - Perfil (role) Inválido - Nenhum perfil selecionado", async () => {
      const response = await injectPost(
        "/auth/register",
        {
          name: "Beatriz Andrade Costa",
          email: "beatriz.costa@kria3d.com",
          password: "Kr3D#2025",
        },
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(userRepository.findUnique).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });
});

describe("RF-02 — Login de Usuário (Blackbox ECP)", () => {
  it("TC-RF02-04 - Usuário + Senha Inválida (vazios) - Ambos os campos em branco", async () => {
    const response = await injectPost("/auth/login", {
      email: "",
      password: "",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: "Dados inválidos",
    });
  });
});
