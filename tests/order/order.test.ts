import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";
import { Order } from "../../src/generated/prisma"; // <-- PascalCase

vi.mock("../../src/lib/clientPrisma", () => {
  const actualPrisma = vi.importActual("../../src/lib/clientPrisma");
  return {
    ...actualPrisma,
    prisma: {
      order: {          // <-- "order" (singular, lowercase) é o nome da delegate no Prisma Client
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (promises) => {
        if (Array.isArray(promises)) return Promise.all(promises);
        if (typeof promises === "function") return promises(prisma);
      }),
    },
  };
});

const orderRepository = vi.mocked(prisma.order); // <-- "order" aqui também

const baseOrder = {
  id: 1,
  title: "Impressão Suporte Action Figure",
  section: "PENDENTE",
  status: "NAO_PAGO",
  archive: "suporte_iron_man.gcode",
  link: "http://link-do-drive.com",
  machine: "Ender 3 S1",
  price: 85.0,
  amount_paid: 40.0,
  cost: 15.0,
  quantity: 1,
  payment_method: "PIX",
  created_at: new Date(),
  updated_at: new Date(),
  tagType: "PETG",
  clientId: 4,           // <-- camelCase, igual ao modelo Prisma gerado
} as unknown as Order;

// Helper para gerar o token JWT com o cargo que precisarmos testar
function authHeaderToken(role = "OPERACIONAL") {
  const token = jwt.sign(
    { email: "user@k3d.com", role },
    "test-secret",
    { subject: "1", expiresIn: "8h" }
  );
  return `Bearer ${token}`;
}

async function injectRequest(method: "GET" | "PUT" | "PATCH" | "DELETE", url: string, payload?: unknown, token?: string) {
  const app = buildApp({ logger: false });

  app.setErrorHandler((error, request, reply) => {
    console.error("====== O BUG REAL ESTÁ AQUI ======");
    console.error(error);
    console.error("==================================");
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    reply.status(500).send({ error: errorMessage });
  });

  try {
    return await app.inject({
      method,
      url,
      payload: payload ? JSON.stringify(payload) : undefined,
      headers: {
        ...(payload ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: token } : {}),
      },
    });
  } finally {
    await app.close();
  }
}
beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});


// TESTES GERAIS 
describe("order routes (Kanban)", () => {

  describe("PATCH /orders/:id/move", () => {
    it("returns 200 and moves the order on Kanban successfully", async () => {
      // Simulamos que o pedido atual está PENDENTE e AGUARDANDO_IMPRESSAO
      orderRepository.findUnique.mockResolvedValue(baseOrder);
      orderRepository.update.mockResolvedValue({
        ...baseOrder,
        section: "FAZENDO"
      });

      const response = await injectRequest(
        "PATCH",
        "/orders/1/move",
        { destinationSection: "FAZENDO" },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: 1,
        section: "FAZENDO"
      });
    });

    it("returns 400 when business rules block the movement", async () => {
      orderRepository.findUnique.mockResolvedValue(baseOrder);

      vi.spyOn(orderRepository, "update").mockRejectedValueOnce(new Error("Não é possível mover o pedido"));

      const response = await injectRequest(
        "PATCH",
        "/orders/1/move",
        { destinationSection: "FAZENDO" },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty("error");
    });
  });

  describe("PUT /orders/:id", () => {
    it("returns 200 and updates order data successfully", async () => {
      orderRepository.findUnique.mockResolvedValue(baseOrder);
      orderRepository.update.mockResolvedValue({
        ...baseOrder,
        title: "Título Atualizado",
        price: 120.0,
      });

      const response = await injectRequest(
        "PUT",
        "/orders/1",
        { title: "Título Atualizado", price: 120.0 },
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        title: "Título Atualizado",
        price: 120.0,
      });
    });
  });

  describe("DELETE /orders/:id", () => {
    it("TC-RF04-01 - returns 200 when order is successfully deleted", async () => {
      orderRepository.findUnique.mockResolvedValue(baseOrder);

      orderRepository.delete.mockResolvedValue(baseOrder);

      const response = await injectRequest(
        "DELETE",
        "/orders/1",
        undefined,
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(200);
    });
  });

  describe("GET /orders (Paginação e Filtros Dinâmicos)", () => {
    it("returns 200, paginated orders and correct metadata structure", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      const response = await injectRequest(
        "GET",
        "/orders?page=1&pageSize=10&section=PENDENTE", // Todos os campos existem no Zod Schema
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("meta");
      expect(body.meta).toMatchObject({
        totalItems: 1,
        itemCount: 1,
        pageSize: 10,
        currentPage: 1,
        totalPages: 1,
      });
      expect(body.data[0].id).toBe(1);
    });

  
  });

  //TESTES DE UPDATE COM MÚLTIPLOS TIPOS DE CAMPOS
  describe("PUT /orders/:id (Múltiplos Tipos de Campos)", () => {
    it("returns 200 and correctly parses multiple fields of different types simultaneously", async () => {
      // 1. O mock do banco simula o retorno com todos os campos já atualizados
      orderRepository.findUnique.mockResolvedValue(baseOrder);
      orderRepository.update.mockResolvedValue({
        ...baseOrder,
        title: "Novo Nome do Arquivo GCODE",
        quantity: 5,
        price: 150.50,
      });


      const payloadComMultiplosTipos = {
        title: "Novo Nome do Arquivo GCODE",
        quantity: 5,
        price: 150.50,
      };

      const response = await injectRequest(
        "PUT",
        "/orders/1",
        payloadComMultiplosTipos, // Enviando o payload misto
        authHeaderToken("GERENTE")
      );

      // 3. Validações
      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toMatchObject({
        title: "Novo Nome do Arquivo GCODE",
        quantity: 5,
        price: 150.50
      });

      // Garante que o Prisma recebeu os tipos de dados já convertidos corretamente
      expect(orderRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            title: "Novo Nome do Arquivo GCODE",
            quantity: 5,
            price: 150.50,
          }),
        })
      );
    });
  });
describe("GET /orders (Paginação e Filtros Dinâmicos)", () => {
    
    it("returns 200, paginated orders and correct metadata structure", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      const response = await injectRequest(
        "GET",
        "/orders?page=1&pageSize=10&section=PENDENTE",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("meta");
      expect(body.meta).toMatchObject({
        totalItems: 1,
        itemCount: 1,
        pageSize: 10,
        currentPage: 1,
        totalPages: 1,
      });
      expect(body.data[0].id).toBe(1);
    });

    it("ignores properties that do not exist in database schema (campo_fantasma)", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      const response = await injectRequest(
        "GET",
        "/orders?campo_fantasma=teste",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);
      
      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

    it("converte strings da URL para os tipos corretos (Int, Float) ao filtrar", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      const response = await injectRequest(
        "GET",
        "/orders?quantity=2&price=85.50",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);

      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            quantity: 2,
            price: 85.50
          }
        })
      );
    });

    it("ignora filtros que venham com valores vazios ou nulos na URL", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      const response = await injectRequest(
        "GET",
        "/orders?title=&section=&machine=",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);

      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

  });

  describe("PATCH /orders/:id/move with invalid ID", () => {
    it("returns 400 when order ID is not numeric", async () => {
      const response = await injectRequest(
        "PATCH",
        "/orders/abc/move",
        { destinationSection: "FAZENDO" },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "ID do pedido inválido." });
    });

    it("returns 400 when order is not found", async () => {
      orderRepository.findUnique.mockResolvedValue(null);

      const response = await injectRequest(
        "PATCH",
        "/orders/999/move",
        { destinationSection: "FAZENDO" },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty("error");
    });

    it("returns 400 when moveOrder throws a generic error", async () => {
      orderRepository.findUnique.mockResolvedValue(baseOrder);
      orderRepository.update.mockRejectedValue(new Error("Unexpected failure"));

      const response = await injectRequest(
        "PATCH",
        "/orders/1/move",
        { destinationSection: "FAZENDO" },
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Unexpected failure" });
    });
  });

  describe("PUT /orders/:id with invalid ID", () => {
    it("returns 400 when order ID is not numeric", async () => {
      const response = await injectRequest(
        "PUT",
        "/orders/abc",
        { title: "Test" },
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "ID do pedido inválido." });
    });

    it("returns 400 when order is not found", async () => {
      orderRepository.findUnique.mockResolvedValue(null);

      const response = await injectRequest(
        "PUT",
        "/orders/999",
        { title: "Test" },
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty("error");
    });

    it("returns 400 when updateOrder throws a generic error", async () => {
      orderRepository.findUnique.mockResolvedValue(baseOrder);
      orderRepository.update.mockRejectedValue(new Error("Unexpected failure"));

      const response = await injectRequest(
        "PUT",
        "/orders/1",
        { title: "Test" },
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Unexpected failure" });
    });
  });

  describe("DELETE /orders/:id with invalid ID", () => {
    it("returns 400 when order ID is not numeric", async () => {
      const response = await injectRequest(
        "DELETE",
        "/orders/abc",
        undefined,
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "ID do pedido inválido." });
    });

    it("returns 400 when order is not found", async () => {
      orderRepository.findUnique.mockResolvedValue(null);

      const response = await injectRequest(
        "DELETE",
        "/orders/999",
        undefined,
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty("error");
    });

    it("returns 400 when deleteOrder throws a generic error", async () => {
      orderRepository.findUnique.mockResolvedValue(baseOrder);
      orderRepository.delete.mockRejectedValue(new Error("Unexpected failure"));

      const response = await injectRequest(
        "DELETE",
        "/orders/1",
        undefined,
        authHeaderToken("GERENTE")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Unexpected failure" });
    });
  });

  describe("GET /orders with different filter types", () => {
    it("filters by title using case-insensitive contains including client name and order ID", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      await injectRequest(
        "GET",
        "/orders?title=suporte",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: "suporte", mode: "insensitive" } },
              { client: { name: { contains: "suporte", mode: "insensitive" } } },
            ],
          },
        })
      );
    });

    it("filters by numeric ID as well when title query is an integer string", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      await injectRequest(
        "GET",
        "/orders?title=42",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: "42", mode: "insensitive" } },
              { client: { name: { contains: "42", mode: "insensitive" } } },
              { id: 42 },
            ],
          },
        })
      );
    });


    it("filters by payment_method parameter", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      await injectRequest(
        "GET",
        "/orders?payment_method=PIX",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            payment_method: { in: expect.arrayContaining(["PIX"]) },
          }),
        })
      );
    });

    it("filters by non-title string field with exact match", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      await injectRequest(
        "GET",
        "/orders?section=PENDENTE",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { section: "PENDENTE" },
        })
      );
    });

    it("returns 400 when getOrders throws a generic error", async () => {
      orderRepository.findMany.mockRejectedValue(new Error("Unexpected failure"));
      orderRepository.count.mockRejectedValue(new Error("Unexpected failure"));

      const response = await injectRequest(
        "GET",
        "/orders",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Unexpected failure" });
    });
  });
});