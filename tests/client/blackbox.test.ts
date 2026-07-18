import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    client: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn().mockResolvedValue({ _count: { orders: 1 } }),
    },
  },
}));

const clientRepository = vi.mocked(prisma.client) as any;

function authToken(role = "OPERACIONAL") {
  return jwt.sign(
    { email: "user@k3d.com", role },
    process.env.JWT_SECRET!,
    { subject: "1", expiresIn: process.env.JWT_EXPIRES_IN as any }
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

async function injectDelete(url: string, token?: string): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "DELETE",
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
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

describe("RF-15 — Criação de Clientes (Blackbox)", () => {
  it("TC-RF15-01 - Cadastrar cliente com dados válidos", async () => {
    clientRepository.create.mockResolvedValue({
      id: 1,
      name: "Carlos Eduardo Ferreira",
      phone: "(83) 98888-4455",
      email: "carlos.ferreira@gmail.com",
    });

    const response = await injectPost(
      "/clients",
      {
        name: "Carlos Eduardo Ferreira",
        phone: "(83) 98888-4455",
        email: "carlos.ferreira@gmail.com",
      },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: "Carlos Eduardo Ferreira",
      phone: "(83) 98888-4455",
    });
  });

  it("TC-RF15-02 - Impedir cadastro com Nome em branco", async () => {
    const response = await injectPost(
      "/clients",
      {
        name: "",
        phone: "(83) 98888-4455",
        email: "carlos.ferreira@gmail.com",
      },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF15-03 - Impedir cadastro com Telefone em branco", async () => {
    const response = await injectPost(
      "/clients",
      {
        name: "Carlos Eduardo Ferreira",
        phone: "",
        email: "carlos.ferreira@gmail.com",
      },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF15-04 - Impedir cadastro com mesmo telefone (duplicidade)", async () => {
    // Simula validação de telefone duplicado no backend.
    // Como o backend atual não valida, o teste serve como especificação do fluxo secundário de erro.
    clientRepository.findFirst.mockResolvedValue({
      id: 2,
      name: "Outro Cliente",
      phone: "(83) 98888-4455",
    });

    const response = await injectPost(
      "/clients",
      {
        name: "Carlos Eduardo Ferreira",
        phone: "(83) 98888-4455",
      },
      authToken("OPERACIONAL")
    );

    // Deve retornar conflito (409) ou requisição inválida (400)
    expect(response.statusCode).toBe(409);
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF15-05 - Cadastrar cliente omitindo e-mail (campo opcional)", async () => {
    clientRepository.findFirst.mockResolvedValue(null);
    clientRepository.create.mockResolvedValue({
      id: 3,
      name: "Carlos Eduardo Ferreira",
      phone: "(83) 98888-4455",
      email: null,
    });

    const response = await injectPost(
      "/clients",
      {
        name: "Carlos Eduardo Ferreira",
        phone: "(83) 98888-4455",
      },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(201);
    expect(clientRepository.create).toHaveBeenCalled();
  });
});

describe("RF-16 — Remoção de Clientes (Blackbox)", () => {
  it("TC-RF16-01 - Desvincular cliente com pedido (tentativa de exclusão bloqueada devido aos pedidos vinculados mantém o cliente no sistema)", async () => {
    clientRepository.findUnique.mockResolvedValue({
      id: 1,
      name: "Carlos Eduardo Ferreira",
      phone: "(83) 98888-4455",
      _count: { orders: 1 },
    });

    const response = await injectDelete("/clients/1", authToken("OPERACIONAL"));

    // O sistema bloqueia a remoção direta para manter a integridade, retornando 400
    expect(response.statusCode).toBe(400);
    expect(clientRepository.delete).not.toHaveBeenCalled();
  });

  it("TC-RF16-02 - Cancelar remoção de cliente na caixa de diálogo mantém o cliente no sistema (sem chamada de API)", async () => {
    // Como a operação é cancelada, nenhuma chamada de DELETE é enviada.
    // O cliente permanece no sistema e pode ser consultado normalmente.
    clientRepository.findUnique.mockResolvedValue({
      id: 1,
      name: "Carlos Eduardo Ferreira",
      phone: "(83) 98888-4455",
    });

    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/clients/1",
        headers: { authorization: `Bearer ${authToken("OPERACIONAL")}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: 1,
        name: "Carlos Eduardo Ferreira",
      });
    } finally {
      await app.close();
    }
  });
});
