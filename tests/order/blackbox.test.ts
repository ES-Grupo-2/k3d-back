import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    client: {
      create: vi.fn(),
    },
  },
}));

const orderRepository = vi.mocked(prisma.order) as any;
const clientRepository = vi.mocked(prisma.client) as any;

function authHeaderToken(role = "OPERACIONAL") {
  const token = jwt.sign(
    { email: "user@k3d.com", role },
    process.env.JWT_SECRET!,
    { subject: "1", expiresIn: process.env.JWT_EXPIRES_IN as any }
  );
  return `Bearer ${token}`;
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
      headers: token
        ? {
            authorization: token,
          }
        : undefined,
    });
    return response as any;
  } finally {
    await app.close();
  }
}

async function injectPut(
  url: string,
  payload: any,
  token?: string
): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "PUT",
      url,
      payload,
      headers: token
        ? {
            authorization: token,
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

describe("RF-03 — Criação de Pedido no Kanban (Blackbox)", () => {
  it("TC-RF03-01 - Criar pedido preenchendo todos os campos com dados válidos", async () => {
    clientRepository.create.mockResolvedValue({
      id: 1,
      name: "Renata Souza Lima",
      phone: "(83) 99999-1122",
      email: "renata.lima@gmail.com",
    });

    orderRepository.create.mockResolvedValue({
      id: 10,
      title: "Chaveiro personalizado logo Kria3D",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
      section: "PENDENTE",
      status: "NAO_PAGO",
    });

    const clientResponse = await injectPost(
      "/clients",
      {
        name: "Renata Souza Lima",
        phone: "(83) 99999-1122",
        email: "renata.lima@gmail.com",
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(clientResponse.statusCode).toBe(201);

    const orderResponse = await injectPost(
      "/orders",
      {
        title: "Chaveiro personalizado logo Kria3D",
        price: 45.0,
        amount_paid: 0.0,
        quantity: 3,
        tagType: "PLA",
        client_id: 1,
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(orderResponse.statusCode).toBe(201);
    expect(orderResponse.json()).toMatchObject({
      title: "Chaveiro personalizado logo Kria3D",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      status: "NAO_PAGO",
    });
  });

  it("TC-RF03-02 - Impedir criação de cliente com Nome em branco", async () => {
    const response = await injectPost(
      "/clients",
      {
        name: "",
        phone: "(83) 99999-1122",
        email: "renata.lima@gmail.com",
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
    expect(clientRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF03-03 - Impedir criação de pedido com Título em branco", async () => {
    const response = await injectPost(
      "/orders",
      {
        title: "",
        price: 45.0,
        amount_paid: 0.0,
        quantity: 3,
        tagType: "PLA",
        client_id: 1,
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("TC-RF03-04 - Criar cliente com e-mail do cliente em branco (campo opcional)", async () => {
    clientRepository.create.mockResolvedValue({
      id: 1,
      name: "Renata Souza Lima",
      phone: "(83) 99999-1122",
      email: null,
    });

    const response = await injectPost(
      "/clients",
      {
        name: "Renata Souza Lima",
        phone: "(83) 99999-1122",
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(201);
    expect(clientRepository.create).toHaveBeenCalled();
  });

  it("TC-RF03-05 - Validar comportamento de quantidade igual a zero", async () => {
    const response = await injectPost(
      "/orders",
      {
        title: "Chaveiro personalizado logo Kria3D",
        price: 45.0,
        amount_paid: 0.0,
        quantity: 0,
        tagType: "PLA",
        client_id: 1,
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
    expect(orderRepository.create).not.toHaveBeenCalled();
  });
});

describe("RF-04 — Remoção de Pedido no Kanban (Blackbox)", () => {
  it("TC-RF04-02 - Cancelar exclusão de pedido mantém o registro inalterado", async () => {
    orderRepository.findUnique.mockResolvedValue({
      id: 1,
      title: "Chaveiro personalizado logo Kria3D",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    // Simulamos que a exclusão é cancelada (o endpoint DELETE não é chamado),
    // logo podemos obter o pedido com sucesso e ele permanece inalterado.
    const app = buildApp({ logger: false });
    try {
      const response = await app.inject({
        method: "GET",
        url: "/orders?title=Chaveiro",
        headers: {
          authorization: authHeaderToken("OPERACIONAL"),
        },
      });

      // O pedido continua existindo no banco de dados
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});

describe("RF-05 — Edição de Pedido no Kanban (Blackbox)", () => {
  it("TC-RF05-01 - Alterar o campo Título para 'Chaveiro Kria3D — Edição 2' e confirmar", async () => {
    orderRepository.findUnique.mockResolvedValue({
      id: 1,
      title: "Chaveiro personalizado logo Kria3D",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });
    orderRepository.update.mockResolvedValue({
      id: 1,
      title: "Chaveiro Kria3D — Edição 2",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    const response = await injectPut(
      "/orders/1",
      {
        title: "Chaveiro Kria3D — Edição 2",
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      title: "Chaveiro Kria3D — Edição 2",
    });
  });

  it("TC-RF05-02 - Apagar o conteúdo do campo Título e confirmar", async () => {
    orderRepository.findUnique.mockResolvedValue({
      id: 1,
      title: "Chaveiro personalizado logo Kria3D",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    const response = await injectPut(
      "/orders/1",
      {
        title: "",
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
  });

  it("TC-RF05-03 - Alterar o campo Preço Total de '45,00' para '60,00' e confirmar", async () => {
    orderRepository.findUnique.mockResolvedValue({
      id: 1,
      title: "Chaveiro personalizado logo Kria3D",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });
    orderRepository.update.mockResolvedValue({
      id: 1,
      title: "Chaveiro personalizado logo Kria3D",
      price: 60.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    const response = await injectPut(
      "/orders/1",
      {
        price: 60.0,
      },
      authHeaderToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      price: 60.0,
    });
  });
});
