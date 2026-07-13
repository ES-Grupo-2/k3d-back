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

describe("RF-01 — Criação de Usuário (Blackbox)", () => {
  it("TC-RF01-01 - Gerente autenticado cadastrando novo Gerente com dados válidos", async () => {
    userRepository.findUnique.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({
      id: 100,
      name: "Beatriz Andrade Costa",
      email: "beatriz.costa@kria3d.com",
      role: "GERENTE",
      created_at: new Date(),
    });

    const response = await injectPost(
      "/auth/register",
      {
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password: "Kr3D#2025",
        confirmation: "Kr3D#2025",
        role: "Gerente",
      },
      authToken("GERENTE"),
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      user: {
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
      },
    });
  });

  it("TC-RF01-02 - Gerente autenticado cadastrando novo Operacional com dados válidos", async () => {
    userRepository.findUnique.mockResolvedValue(null);
    userRepository.create.mockResolvedValue({
      id: 101,
      name: "Beatriz Andrade Costa",
      email: "joao.neves@kria3d.com",
      role: "OPERACIONAL",
      created_at: new Date(),
    });

    const response = await injectPost(
      "/auth/register",
      {
        name: "Beatriz Andrade Costa",
        email: "joao.neves@kria3d.com",
        password: "Kr3D#2025",
        confirmation: "Kr3D#2025",
        role: "Operacional",
      },
      authToken("GERENTE"),
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      user: {
        name: "Beatriz Andrade Costa",
        email: "joao.neves@kria3d.com",
      },
    });
  });

  it("TC-RF01-03 - Impedir cadastro com Nome em branco", async () => {
    const response = await injectPost(
      "/auth/register",
      {
        name: "",
        email: "beatriz.costa@kria3d.com",
        password: "Kr3D#2025",
        confirmation: "Kr3D#2025",
        role: "Gerente",
      },
      authToken("GERENTE"),
    );

    expect(response.statusCode).toBe(400);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF01-04 - Impedir cadastro com e-mail inválido (sem domínio)", async () => {
    const response = await injectPost(
      "/auth/register",
      {
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d",
        password: "Kr3D#2025",
        confirmation: "Kr3D#2025",
        role: "Gerente",
      },
      authToken("GERENTE"),
    );

    expect(response.statusCode).toBe(400);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF01-05 - Impedir cadastro com e-mail duplicado", async () => {
    userRepository.findUnique.mockResolvedValue({
      id: 1,
      email: "admin@kria3d.com",
    });

    const response = await injectPost(
      "/auth/register",
      {
        name: "Beatriz Andrade Costa",
        email: "admin@kria3d.com",
        password: "Kr3D#2025",
        confirmation: "Kr3D#2025",
        role: "Gerente",
      },
      authToken("GERENTE"),
    );

    expect(response.statusCode).toBe(409);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF01-06 - Impedir cadastro com senhas divergentes", async () => {
    const response = await injectPost(
      "/auth/register",
      {
        name: "Beatriz Andrade Costa",
        email: "beatriz.costa@kria3d.com",
        password: "Kr3D#2025",
        confirmation: "Kr3D#2026",
        role: "Gerente",
      },
      authToken("GERENTE"),
    );

    expect(response.statusCode).toBe(400);
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});

describe("RF-02 — Login de Usuário (Blackbox)", () => {
  it("TC-RF02-05 - Impedir login com campos de usuário e senha em branco", async () => {
    const response = await injectPost(
      "/auth/login",
      {
        email: "",
        password: "",
      },
    );

    expect(response.statusCode).toBe(400);
  });
});
