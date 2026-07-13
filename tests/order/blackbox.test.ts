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

describe("RF-03 — Criação de Pedido no Kanban (Blackbox ECP)", () => {
  describe("Client Info Validation (Name, Phone, Email)", () => {
    it("TC-RF03-01 - Nome do Cliente Válido - Preenchido (Renata Souza Lima)", async () => {
      clientRepository.create.mockResolvedValue({
        id: 1,
        name: "Renata Souza Lima",
        phone: "(83) 99999-1122",
        email: "renata.lima@gmail.com",
      });

      const response = await injectPost(
        "/clients",
        {
          name: "Renata Souza Lima",
          phone: "(83) 99999-1122",
          email: "renata.lima@gmail.com",
        },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        name: "Renata Souza Lima",
      });
      expect(clientRepository.create).toHaveBeenCalled();
    });

    it("TC-RF03-02 - Nome do Cliente Inválido - Campo obrigatório em branco", async () => {
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

    it("TC-RF03-03 - Telefone do Cliente Válido - Preenchido ((83) 99999-1122)", async () => {
      clientRepository.create.mockResolvedValue({
        id: 1,
        name: "Renata Souza Lima",
        phone: "(83) 99999-1122",
        email: "renata.lima@gmail.com",
      });

      const response = await injectPost(
        "/clients",
        {
          name: "Renata Souza Lima",
          phone: "(83) 99999-1122",
          email: "renata.lima@gmail.com",
        },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        phone: "(83) 99999-1122",
      });
      expect(clientRepository.create).toHaveBeenCalled();
    });

    it("TC-RF03-04 - Telefone do Cliente Inválido - Campo obrigatório em branco", async () => {
      const response = await injectPost(
        "/clients",
        {
          name: "Renata Souza Lima",
          phone: "",
          email: "renata.lima@gmail.com",
        },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(400);
      expect(clientRepository.create).not.toHaveBeenCalled();
    });

    it("TC-RF03-05 - Email do Cliente Válido - Opcional preenchido (renata.lima@gmail.com)", async () => {
      clientRepository.create.mockResolvedValue({
        id: 1,
        name: "Renata Souza Lima",
        phone: "(83) 99999-1122",
        email: "renata.lima@gmail.com",
      });

      const response = await injectPost(
        "/clients",
        {
          name: "Renata Souza Lima",
          phone: "(83) 99999-1122",
          email: "renata.lima@gmail.com",
        },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        email: "renata.lima@gmail.com",
      });
      expect(clientRepository.create).toHaveBeenCalled();
    });

    it("TC-RF03-06 - Email do Cliente Válido - Opcional vazio (deixado em branco)", async () => {
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
  });

  describe("Order Info Validation (Title, Price, Paid, Quantity)", () => {
    it("TC-RF03-07 - Título do Pedido Válido - Preenchido (Chaveiro personalizado logo Kria3D)", async () => {
      orderRepository.create.mockResolvedValue({
        id: 10,
        title: "Chaveiro personalizado logo Kria3D",
        price: 45.0,
        amount_paid: 0.0,
        quantity: 3,
        tagType: "PLA",
        clientId: 1,
      });

      const response = await injectPost(
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

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        title: "Chaveiro personalizado logo Kria3D",
      });
      expect(orderRepository.create).toHaveBeenCalled();
    });

    it("TC-RF03-08 - Título do Pedido Inválido - Campo obrigatório em branco", async () => {
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

    it("TC-RF03-09 - Preço Total / Valor Pago / Quantidade Válidos (Preço=45.00, Pago=0, Quantidade=3)", async () => {
      orderRepository.create.mockResolvedValue({
        id: 10,
        title: "Chaveiro personalizado logo Kria3D",
        price: 45.0,
        amount_paid: 0.0,
        quantity: 3,
        tagType: "PLA",
        clientId: 1,
      });

      const response = await injectPost(
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

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        price: 45.0,
        amount_paid: 0.0,
        quantity: 3,
      });
      expect(orderRepository.create).toHaveBeenCalled();
    });
  });

  describe("RF-05 — Edição de Pedido no Kanban (Blackbox ECP)", () => {
    it("TC-RF05-01 - Campos do Pedido (edição) Válida - Alteração de um campo válido (ex.: Título alterado para 'Chaveiro Kria3D — Edição 2')", async () => {
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
      expect(orderRepository.update).toHaveBeenCalled();
    });

    it("TC-RF05-02 - Campo Obrigatório Inválido - Campo obrigatório apagado durante a edição (ex.: Título esvaziado)", async () => {
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
      expect(orderRepository.update).not.toHaveBeenCalled();
    });
  });
});
