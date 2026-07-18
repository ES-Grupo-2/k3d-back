import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    calculatorParameter: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const calculatorRepo = vi.mocked(prisma.calculatorParameter) as any;

function authToken(role = "GERENTE") {
  return jwt.sign(
    { email: "manager@kria3d.com", role },
    process.env.JWT_SECRET!,
    { subject: "99", expiresIn: process.env.JWT_EXPIRES_IN as any }
  );
}

async function injectPost(
  url: string,
  payload: any,
  token?: string
): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "POST",
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return response as any;
  } finally {
    await app.close();
  }
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

const mockParameters = {
  id: 1,
  filament_price: 120.0,
  kw_cost: 0.95,
  depreciation: 0.02,
  profit_margin: 35.0,
  updated_at: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RF-08 — Calcular Custo de Pedido (Blackbox)", () => {
  it("TC-RF08-01 - Calcular custo informando Filamento='250' e KiloWatts='1.5' com parâmetros configurados", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectPost(
      "/calculator/calculate",
      {
        filament_weight_grams: 250,
        kwh_used: 1.5,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty("totalCost");
    expect(response.json().totalCost).toBeGreaterThan(0);
  });

  it("TC-RF08-02 - Calcular custo com valores de fronteira mínimos válidos (Filamento='0.01' e KiloWatts='0.01')", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectPost(
      "/calculator/calculate",
      {
        filament_weight_grams: 0.01,
        kwh_used: 0.01,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().totalCost).toBeGreaterThan(0);
  });

  it("TC-RF08-03 - Impedir cálculo com Filamento='0' (fronteira inválida)", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectPost(
      "/calculator/calculate",
      {
        filament_weight_grams: 0,
        kwh_used: 1.5,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
  });

  it("TC-RF08-04 - Impedir cálculo com Filamento negativo (Filamento='-50')", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectPost(
      "/calculator/calculate",
      {
        filament_weight_grams: -50,
        kwh_used: 1.5,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
  });

  it("TC-RF08-05 - Impedir cálculo com entrada não numérica (Filamento='abc')", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectPost(
      "/calculator/calculate",
      {
        filament_weight_grams: "abc",
        kwh_used: 1.5,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
  });

  it("TC-RF08-06 - Impedir cálculo com Filamento em branco", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectPost(
      "/calculator/calculate",
      {
        kwh_used: 1.5,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
  });

  it("TC-RF08-07 - Impedir cálculo quando os parâmetros não estão configurados na primeira vez", async () => {
    calculatorRepo.findFirst.mockResolvedValue(null);

    const response = await injectPost(
      "/calculator/calculate",
      {
        filament_weight_grams: 250,
        kwh_used: 1.5,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
  });
});

describe("RF-09 — Configuração de Parâmetros da Calculadora (Blackbox)", () => {
  it("TC-RF09-01 - Salvar parâmetros da calculadora com dados válidos", async () => {
    calculatorRepo.findFirst.mockResolvedValue(null);
    calculatorRepo.create.mockResolvedValue({
      id: 1,
      filament_price: 120.0,
      kw_cost: 0.95,
      depreciation: 0.02,
      profit_margin: 35.0,
      updated_at: new Date(),
    });

    const response = await injectPost(
      "/calculator/parameters",
      {
        filament_price: 120.0,
        tipo: "PLA",
        depreciation: 0.02,
        kw_cost: 0.95,
        profit_margin: 35.0,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(200);
    expect(calculatorRepo.create).toHaveBeenCalled();
  });

  it("TC-RF09-02 - Impedir salvamento com Margem de Lucro negativa (Margem='-5')", async () => {
    const response = await injectPost(
      "/calculator/parameters",
      {
        filament_price: 120.0,
        tipo: "PLA",
        depreciation: 0.02,
        kw_cost: 0.95,
        profit_margin: -5.0,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
    expect(calculatorRepo.create).not.toHaveBeenCalled();
    expect(calculatorRepo.update).not.toHaveBeenCalled();
  });

  it("TC-RF09-03 - Impedir salvamento com Preço do Filamento em branco", async () => {
    const response = await injectPost(
      "/calculator/parameters",
      {
        tipo: "PLA",
        depreciation: 0.02,
        kw_cost: 0.95,
        profit_margin: 35.0,
      },
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(400);
    expect(calculatorRepo.create).not.toHaveBeenCalled();
    expect(calculatorRepo.update).not.toHaveBeenCalled();
  });

  it("TC-RF09-04 - Carregar automaticamente os parâmetros configurados previamente para pré-preenchimento", async () => {
    calculatorRepo.findFirst.mockResolvedValue(mockParameters);

    const response = await injectGet(
      "/calculator/parameters",
      authToken("GERENTE")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      filament_price: 120.0,
      kw_cost: 0.95,
      depreciation: 0.02,
      profit_margin: 35.0,
    });
  });
});
