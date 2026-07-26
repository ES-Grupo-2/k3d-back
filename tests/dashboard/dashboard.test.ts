import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

const orderRepository = vi.mocked(prisma.order);
const queryRawMock = vi.mocked(prisma.$queryRaw);


// ── helpers ───────────────────────────────────────────────────────────────────

function authToken(role: "GERENTE" | "OPERACIONAL" | "FINANCEIRO" = "GERENTE") {
  return jwt.sign(
    { email: "manager@email.com", role },
    "test-secret",
    { subject: "99", expiresIn: "8h" },
  );
}

async function inject(url: string, token?: string) {
  const app = buildApp({ logger: false });
  try {
    return await app.inject({
      method: "GET",
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  } finally {
    await app.close();
  }
}

// ── fixtures ──────────────────────────────────────────────────────────────────

const baseAggregateResult = {
  _sum: { price: 1000, cost: 400 },
  _avg: { price: 100 },
  _count: { id: 10 },
};

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "8h";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("dashboard routes", () => {

  // ── GET /financeiro ───────────────────────────────────────────────────────

  describe("GET /financeiro", () => {
    it("returns 200 with aggregated financial data for GERENTE", async () => {
      orderRepository.aggregate.mockResolvedValue(baseAggregateResult);

      const response = await inject("/dashboard/financeiro", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        periodo: "MENSAL",
        receitaTotal: 1000,
        custoTotal: 400,
        lucroTotal: 600,
        precoMedio: 100,
        ticketMedio: 100,
        totalPedidos: 10,
      });
      expect(orderRepository.aggregate).toHaveBeenCalledOnce();
    });

    it("calculates lucroTotal correctly when cost exceeds revenue", async () => {
      orderRepository.aggregate.mockResolvedValue({
        _sum: { price: 300, cost: 500 },
        _avg: { price: 50 },
        _count: { id: 6 },
      });

      const response = await inject("/dashboard/financeiro", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        receitaTotal: 300,
        custoTotal: 500,
        lucroTotal: -200,
      });
    });

    it("defaults sums/averages to 0 when there are no orders in range", async () => {
      orderRepository.aggregate.mockResolvedValue({
        _sum: { price: null, cost: null },
        _avg: { price: null },
        _count: { id: 0 },
      });

      const response = await inject("/dashboard/financeiro", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        receitaTotal: 0,
        custoTotal: 0,
        lucroTotal: 0,
        precoMedio: 0,
        ticketMedio: 0,
        totalPedidos: 0,
      });
    });

    it("applies the tagType filter to the Prisma where clause", async () => {
      orderRepository.aggregate.mockResolvedValue(baseAggregateResult);

      const response = await inject(
        "/dashboard/financeiro?tagType=PLA",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(orderRepository.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tagType: "PLA" }),
        }),
      );
    });

    it("does not include tagType in where clause when not provided", async () => {
      orderRepository.aggregate.mockResolvedValue(baseAggregateResult);

      await inject("/dashboard/financeiro", authToken("GERENTE"));

      const callArgs = orderRepository.aggregate.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty("tagType");
    });

    it("uses a custom date range when ref is provided", async () => {
      orderRepository.aggregate.mockResolvedValue(baseAggregateResult);

      const response = await inject(
        "/dashboard/financeiro?periodo=SEMANAL&ref=2026-01-01,2026-01-07",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.dataInicio).toBe(new Date("2026-01-01T00:00:00").toISOString());
      expect(body.dataFim).toBe(new Date("2026-01-07T23:59:59.999").toISOString());
    });

    it("returns 400 for an invalid periodo value", async () => {
      const response = await inject(
        "/dashboard/financeiro?periodo=ANUAL",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(orderRepository.aggregate).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("/dashboard/financeiro");

      expect(response.statusCode).toBe(401);
      expect(orderRepository.aggregate).not.toHaveBeenCalled();
    });

    it("returns 403 for OPERACIONAL role (not allowed on financeiro)", async () => {
      const response = await inject("/dashboard/financeiro", authToken("OPERACIONAL"));

      expect(response.statusCode).toBe(403);
      expect(orderRepository.aggregate).not.toHaveBeenCalled();
    });

    it("returns 401 for an unrecognized role", async () => {
      const response = await inject("/dashboard/financeiro", authToken("FINANCEIRO"));

      expect(response.statusCode).toBe(401);
      expect(orderRepository.aggregate).not.toHaveBeenCalled();
    });
  });

  // ── GET /operacional ──────────────────────────────────────────────────────

  describe("GET /operacional", () => {
    it("returns 200 with tag counts grouped by tagType", async () => {
      orderRepository.groupBy.mockResolvedValue([
        { tagType: "PLA", _count: { id: 7 } },
        { tagType: "RESINA", _count: { id: 3 } },
      ]);

      const response = await inject("/dashboard/operacional", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        periodo: "MENSAL",
        tags: [
          { tagType: "PLA", quantidade: 7 },
          { tagType: "RESINA", quantidade: 3 },
        ],
        totalPedidos: 10,
      });
    });

    it("returns 200 with an empty tags list and totalPedidos 0 when there are no orders", async () => {
      orderRepository.groupBy.mockResolvedValue([]);

      const response = await inject("/dashboard/operacional", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        tags: [],
        totalPedidos: 0,
      });
    });

    it("returns 200 for OPERACIONAL role (also allowed)", async () => {
      orderRepository.groupBy.mockResolvedValue([
        { tagType: "PLA", _count: { id: 5 } },
      ]);

      const response = await inject("/dashboard/operacional", authToken("OPERACIONAL"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        tags: [{ tagType: "PLA", quantidade: 5 }],
        totalPedidos: 5,
      });
    });

    it("applies the tagType filter to the Prisma where clause", async () => {
      orderRepository.groupBy.mockResolvedValue([
        { tagType: "PLA", _count: { id: 4 } },
      ]);

      await inject("/dashboard/operacional?tagType=PLA", authToken("GERENTE"));

      expect(orderRepository.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tagType: "PLA" }),
        }),
      );
    });

    it("returns 400 for an invalid periodo value", async () => {
      const response = await inject(
        "/dashboard/operacional?periodo=DIARIO",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(orderRepository.groupBy).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("/dashboard/operacional");

      expect(response.statusCode).toBe(401);
      expect(orderRepository.groupBy).not.toHaveBeenCalled();
    });

    it("returns 401 for an unrecognized role", async () => {
      const response = await inject("/dashboard/operacional", authToken("FINANCEIRO"));

      expect(response.statusCode).toBe(401);
      expect(orderRepository.groupBy).not.toHaveBeenCalled();
    });
  });


  describe("GET /financeiro/receita-diaria", () => {


    it("uses a custom date range when ref is provided", async () => {
      queryRawMock.mockResolvedValue([]);

      const response = await inject(
        "/dashboard/financeiro/receita-diaria?periodo=SEMANAL&ref=2026-01-01,2026-01-07",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(queryRawMock).toHaveBeenCalledOnce();
    });

    it("returns 400 for an invalid periodo value", async () => {
      const response = await inject(
        "/dashboard/financeiro/receita-diaria?periodo=ANUAL",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("/dashboard/financeiro/receita-diaria");

      expect(response.statusCode).toBe(401);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("returns 403 for OPERACIONAL role (not allowed on receita-diaria)", async () => {
      const response = await inject("/dashboard/financeiro/receita-diaria", authToken("OPERACIONAL"));

      expect(response.statusCode).toBe(403);
      expect(queryRawMock).not.toHaveBeenCalled();
    });

    it("returns 401 for an unrecognized role", async () => {
      const response = await inject("/dashboard/financeiro/receita-diaria", authToken("FINANCEIRO"));

      expect(response.statusCode).toBe(401);
      expect(queryRawMock).not.toHaveBeenCalled();
    });
  });

});
