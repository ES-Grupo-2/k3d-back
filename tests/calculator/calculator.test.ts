import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

// Mock do Prisma focando no modelo calculatorParameter
vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    calculatorParameter: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const calculatorRepo = vi.mocked(prisma.calculatorParameter);

// Função auxiliar para gerar tokens de acordo com o perfil
function authToken(role = "OPERACIONAL") {
  return jwt.sign(
    {
      email: "employee@email.com",
      role,
    },
    "test-secret",
    {
      subject: "99",
      expiresIn: "8h",
    },
  );
}

// Auxiliar para requisições GET
async function injectGet(url: string, token?: string) {
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

// Auxiliar para requisições POST
async function injectPost(url: string, payload: any, token?: string) {
  const app = buildApp({ logger: false });

  try {
    return await app.inject({
      method: "POST",
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      payload,
    });
  } finally {
    await app.close();
  }
}

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "8h";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Dados de mock que simulam o retorno do banco
const mockParameters = {
  id: 1,
  filament_price: 150.0,
  kw_cost: 0.95,
  depreciation: 2.5,
  profit_margin: 100.0, // 100%
  updated_at: new Date("2026-06-25T10:00:00.000Z"),
};

describe("calculator routes", () => {
  describe("GET /calculator/parameters", () => {
    it("returns 200 and the current parameters for GERENTE", async () => {
      calculatorRepo.findFirst.mockResolvedValue(mockParameters);

      const response = await injectGet(
        "/calculator/parameters",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        ...mockParameters,
        updated_at: mockParameters.updated_at.toISOString(),
      });
      expect(calculatorRepo.findFirst).toHaveBeenCalledTimes(1);
    });

    it("returns 403 Forbidden for OPERACIONAL profile", async () => {
      const response = await injectGet(
        "/calculator/parameters",
        authToken("OPERACIONAL"),
      );

      expect(response.statusCode).toBe(403);
      expect(calculatorRepo.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when parameters are not yet configured", async () => {
      calculatorRepo.findFirst.mockResolvedValue(null);

      const response = await injectGet(
        "/calculator/parameters",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        error: "Parâmetros da calculadora não configurados pelo Gerente.",
      });
    });
  });

  describe("POST /calculator/parameters", () => {
    const validPayload = {
      filament_price: 120.0,
      kw_cost: 0.85,
      depreciation: 5.0,
      profit_margin: 50.0,
    };

    it("returns 200, creates new parameters when none exist and confirms saving", async () => {
      calculatorRepo.findFirst.mockResolvedValue(null); // Nenhum param existe
      calculatorRepo.create.mockResolvedValue({
        id: 1,
        ...validPayload,
        updated_at: new Date("2026-06-25T10:00:00.000Z"),
      });

      const response = await injectPost(
        "/calculator/parameters",
        validPayload,
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Parâmetros configurados e salvos com sucesso!");
      expect(response.json().data).toMatchObject(validPayload);
      expect(calculatorRepo.create).toHaveBeenCalledWith({ data: validPayload });
      expect(calculatorRepo.update).not.toHaveBeenCalled();
    });

    it("returns 200 and updates parameters when they already exist", async () => {
      calculatorRepo.findFirst.mockResolvedValue(mockParameters); // Já existe
      calculatorRepo.update.mockResolvedValue({
        ...mockParameters,
        ...validPayload,
        updated_at: new Date("2026-06-25T11:00:00.000Z"),
      });

      const response = await injectPost(
        "/calculator/parameters",
        validPayload,
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBe("Parâmetros configurados e salvos com sucesso!");
      expect(calculatorRepo.update).toHaveBeenCalledWith({
        where: { id: mockParameters.id },
        data: validPayload,
      });
    });

    it("returns 403 Forbidden for OPERACIONAL profile", async () => {
      const response = await injectPost(
        "/calculator/parameters",
        validPayload,
        authToken("OPERACIONAL"),
      );

      expect(response.statusCode).toBe(403);
      expect(calculatorRepo.findFirst).not.toHaveBeenCalled();
    });

    it("returns 400 Bad Request for invalid body (Zod error)", async () => {
      const invalidPayload = {
        filament_price: -10, // Inválido, não pode ser negativo
        // Faltam os outros campos obrigatórios
      };

      const response = await injectPost(
        "/calculator/parameters",
        invalidPayload,
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(calculatorRepo.update).not.toHaveBeenCalled();
      expect(calculatorRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("POST /calculator/calculate", () => {
    const validCalculationInput = {
      filament_weight_grams: 500, // 500g (meio kg)
      kwh_used: 10,               // 10 kwh
    };

    it("returns 200 and calculates total cost and suggested price correctly", async () => {
      calculatorRepo.findFirst.mockResolvedValue(mockParameters);

      // Regra com mockParameters:
      // filament = (500 / 1000) * 150.0 = 75.0
      // energy = 10 * 0.95 = 9.5
      // depreciation = 2.5
      // totalCost = 75.0 + 9.5 + 2.5 = 87.0
      // suggestedPrice (100% margin) = 87.0 * 2 = 174.0

      const response = await injectPost(
        "/calculator/calculate",
        validCalculationInput,
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        inputs: validCalculationInput,
        breakdown: {
          filamentCost: 75.0,
          energyCost: 9.5,
          depreciationCost: 2.5,
        },
        custoTotal: 87.0,
        precoSugerido: 174.0,
      });
    });

    it("returns 403 Forbidden for OPERACIONAL profile", async () => {
      const response = await injectPost(
        "/calculator/calculate",
        validCalculationInput,
        authToken("OPERACIONAL"),
      );

      expect(response.statusCode).toBe(403);
    });

    it("returns 400 if parameters are not configured by the manager yet", async () => {
      calculatorRepo.findFirst.mockResolvedValue(null);

      const response = await injectPost(
        "/calculator/calculate",
        validCalculationInput,
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Nenhum parâmetro base encontrado. O Gerente precisa configurar os valores antes do cálculo.",
      });
    });

    it("returns 400 Bad Request for invalid inputs (Zod error)", async () => {
      const invalidCalculationInput = {
        filament_weight_grams: 0, // Inválido (deve ser maior que zero)
        kwh_used: "dez", // Inválido (deve ser número)
      };

      const response = await injectPost(
        "/calculator/calculate",
        invalidCalculationInput,
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(400);
    });
  });
});