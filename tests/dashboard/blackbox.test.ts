import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

const orderRepository = vi.mocked(prisma.order) as any;

function authToken(role = "GERENTE") {
  return jwt.sign(
    { email: "manager@kria3d.com", role },
    process.env.JWT_SECRET!,
    { subject: "99", expiresIn: process.env.JWT_EXPIRES_IN as any }
  );
}

async function injectGet(url: string, token?: string): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "GET",
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return response as any;
  } finally {
    await app.close();
  }
}

const baseAggregateResult = {
  _sum: { amount_paid: 1000, cost: 400 },
  _avg: { amount_paid: 100, price: 120 },
  _count: { id: 10 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RF-10 — Visualização do Dashboard Operacional (Blackbox)", () => {
  it("TC-RF10-01 - Acessar a aba Dashboard Operacional e carregar período padrão (mensal)", async () => {
    orderRepository.groupBy.mockResolvedValue([
      { tagType: "PLA", _count: { id: 7 } },
      { tagType: "RESINA", _count: { id: 3 } },
    ]);

    const response = await injectGet("/dashboard/operacional", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "MENSAL",
      totalPedidos: 10,
    });
  });

  it("TC-RF10-02 - Selecionar o filtro de período 'Semanal' no Dashboard Operacional", async () => {
    orderRepository.groupBy.mockResolvedValue([
      { tagType: "PLA", _count: { id: 2 } },
    ]);

    const response = await injectGet("/dashboard/operacional?periodo=SEMANAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "SEMANAL",
      totalPedidos: 2,
    });
  });

  it("TC-RF10-03 - Selecionar o filtro de período 'Semestral' no Dashboard Operacional", async () => {
    orderRepository.groupBy.mockResolvedValue([
      { tagType: "PLA", _count: { id: 15 } },
      { tagType: "RESINA", _count: { id: 5 } },
    ]);

    const response = await injectGet("/dashboard/operacional?periodo=SEMESTRAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "SEMESTRAL",
      totalPedidos: 20,
    });
  });
});

describe("RF-11 — Visualização do Dashboard Financeiro (Blackbox)", () => {
  it("TC-RF11-01 - Acessar a aba Dashboard Financeiro e carregar período padrão (mensal) com indicadores financeiros", async () => {
    orderRepository.aggregate.mockResolvedValue(baseAggregateResult);

    const response = await injectGet("/dashboard/financeiro", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "MENSAL",
      receitaTotal: 1000,
      custoTotal: 400,
      lucroTotal: 600,
      precoMedio: 120,
      ticketMedio: 100,
      totalPedidos: 10,
    });
  });

  it("TC-RF11-02 - Selecionar o filtro de período 'Semanal' no Dashboard Financeiro", async () => {
    orderRepository.aggregate.mockResolvedValue({
      _sum: { amount_paid: 200, cost: 80 },
      _avg: { amount_paid: 100, price: 110 },
      _count: { id: 2 },
    });

    const response = await injectGet("/dashboard/financeiro?periodo=SEMANAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "SEMANAL",
      receitaTotal: 200,
      lucroTotal: 120,
    });
  });

  it("TC-RF11-03 - Selecionar o filtro de período 'Semestral' no Dashboard Financeiro", async () => {
    orderRepository.aggregate.mockResolvedValue({
      _sum: { amount_paid: 5000, cost: 2000 },
      _avg: { amount_paid: 100, price: 120 },
      _count: { id: 50 },
    });

    const response = await injectGet("/dashboard/financeiro?periodo=SEMESTRAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "SEMESTRAL",
      receitaTotal: 5000,
      lucroTotal: 3000,
    });
  });
});

describe("RF-12 — Filtros por Tempo nos Dashboards (Blackbox)", () => {
  it("TC-RF12-01 - Selecionar o período 'Semanal' no filtro de tempo", async () => {
    orderRepository.aggregate.mockResolvedValue({
      _sum: { amount_paid: 150, cost: 50 },
      _avg: { amount_paid: 75, price: 90 },
      _count: { id: 2 },
    });

    const response = await injectGet("/dashboard/financeiro?periodo=SEMANAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "SEMANAL",
      receitaTotal: 150,
      lucroTotal: 100,
    });
  });

  it("TC-RF12-02 - Selecionar o período 'Mensal' no filtro de tempo (valor padrão)", async () => {
    orderRepository.aggregate.mockResolvedValue(baseAggregateResult);

    const response = await injectGet("/dashboard/financeiro?periodo=MENSAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "MENSAL",
    });
  });

  it("TC-RF12-03 - Selecionar o período 'Semestral' no filtro de tempo", async () => {
    orderRepository.aggregate.mockResolvedValue({
      _sum: { amount_paid: 6000, cost: 2500 },
      _avg: { amount_paid: 120, price: 130 },
      _count: { id: 50 },
    });

    const response = await injectGet("/dashboard/financeiro?periodo=SEMESTRAL", authToken("GERENTE"));

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      periodo: "SEMESTRAL",
      receitaTotal: 6000,
      lucroTotal: 3500,
    });
  });
});

describe("RF-13 — Filtros por Categoria nos Dashboards (Blackbox)", () => {
  it("TC-RF13-01 - Selecionar apenas a categoria 'Brinde' no filtro", async () => {
    orderRepository.groupBy.mockResolvedValue([
      { tagType: "Brinde", _count: { id: 5 } },
    ]);

    const response = await injectGet(
      "/dashboard/operacional?tagType=Brinde",
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(200);
    expect(orderRepository.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tagType: "Brinde" }),
      })
    );
  });

  it("TC-RF13-02 - Selecionar simultaneamente as categorias 'Brinde' e 'Chaveiro' no filtro (esperado falhar na validação schema de string única)", async () => {
    const response = await injectGet(
      "/dashboard/operacional?tagType=Brinde&tagType=Chaveiro",
      authToken("GERENTE")
    );

    // Zod schema tagType é string. Dependendo do parser do fastify, passar múltiplos parâmetros de query idênticos 
    // converte em array de strings, o que causará erro 400 (Dados inválidos) devido ao schema Zod string.
    expect(response.statusCode).toBe(400);
  });

  it("TC-RF13-03 - Remover a seleção de todas as categorias no filtro", async () => {
    orderRepository.groupBy.mockResolvedValue([
      { tagType: "Brinde", _count: { id: 5 } },
      { tagType: "Chaveiro", _count: { id: 10 } },
    ]);

    const response = await injectGet(
      "/dashboard/operacional",
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(200);
    expect(orderRepository.groupBy).toHaveBeenCalledWith(
      expect.not.objectContaining({
        where: expect.objectContaining({ tagType: expect.anything() }),
      })
    );
  });
});
