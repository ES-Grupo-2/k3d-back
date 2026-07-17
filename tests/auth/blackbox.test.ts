import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => {
  const prismaMock: any = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    calculatorParameter: {
      findFirst: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  };
  prismaMock.$transaction = vi.fn(async (promises: any) => {
    if (Array.isArray(promises)) return Promise.all(promises);
    if (typeof promises === "function") return promises(prismaMock);
  });
  return { prisma: prismaMock };
});

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
        role: "GERENTE",
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
        role: "OPERACIONAL",
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
        role: "GERENTE",
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
        role: "GERENTE",
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
        role: "GERENTE",
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
        role: "GERENTE",
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

describe("RF-14 — Controle de Acesso por Perfil (Blackbox)", () => {
  it("TC-RF14-01 - Usuário Gerente acessa a Calculadora", async () => {
    const calculatorRepo = (prisma as any).calculatorParameter;
    calculatorRepo.findFirst.mockResolvedValue({ id: 1 });

    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/calculator/parameters",
        headers: { authorization: `Bearer ${authToken("GERENTE")}` },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("TC-RF14-02 - Usuário Operacional tem acesso negado à Calculadora", async () => {
    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/calculator/parameters",
        headers: { authorization: `Bearer ${authToken("OPERACIONAL")}` },
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("TC-RF14-03 - Usuário Gerente acessa o Dashboard Financeiro", async () => {
    const orderRepo = (prisma as any).order;
    orderRepo.aggregate.mockResolvedValue({
      _sum: { amount_paid: 0, cost: 0 },
      _avg: { amount_paid: 0, price: 0 },
      _count: { id: 0 },
    });

    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/dashboard/financeiro",
        headers: { authorization: `Bearer ${authToken("GERENTE")}` },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("TC-RF14-04 & TC-RF14-05 - Usuário Operacional tem acesso negado ao Dashboard Financeiro", async () => {
    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/dashboard/financeiro",
        headers: { authorization: `Bearer ${authToken("OPERACIONAL")}` },
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });

  it("TC-RF14-06 - Usuário Operacional acessa o Kanban", async () => {
    const orderRepo = (prisma as any).order;
    orderRepo.findMany.mockResolvedValue([]);
    orderRepo.count.mockResolvedValue(0);

    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/orders",
        headers: { authorization: `Bearer ${authToken("OPERACIONAL")}` },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("TC-RF14-07 - Usuário Operacional acessa o Dashboard Operacional", async () => {
    const orderRepo = (prisma as any).order;
    orderRepo.groupBy.mockResolvedValue([]);

    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/dashboard/operacional",
        headers: { authorization: `Bearer ${authToken("OPERACIONAL")}` },
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
