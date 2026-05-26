import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app"; // ajuste o caminho do seu app
import { prisma } from "../../src/lib/clientPrisma"; // ajuste o caminho do seu cliente prisma
import { orders } from "../../src/generated/prisma";

// 1. Mockamos o Prisma Client isolando a tabela 'orders'
vi.mock("../../src/lib/clientPrisma", () => {
  const actualPrisma = vi.importActual("../../src/lib/clientPrisma");
  return {
    ...actualPrisma,
    prisma: {
      orders: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      // Garante que se o service usar transaction no move, ele execute os mocks corretamente
      $transaction: vi.fn(async (promises) => {
        if (Array.isArray(promises)) return Promise.all(promises);
        if (typeof promises === "function") return promises(prisma);
      }),
    },
  };
});

const orderRepository = vi.mocked(prisma.orders);

// Objeto base para reaproveitarmos nos retornos simulados do banco
const baseOrder = {
  id: 1,
  title: "Impressão Suporte Action Figure",
  section: "PENDENTE",
  status: "PAGO",
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
  client_id: 4,
} as unknown as orders;

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
    it("returns 200 when order is successfully deleted", async () => {
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
        "/orders?page=1&limit=10&section=PENDENTE",
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
        itemsPerPage: 10,
        currentPage: 1,
        totalPages: 1,
      });
      expect(body.data[0].id).toBe(1);
    });

    it("ignores properties that do not exist in database schema", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      // Passando 'campo_fantasma' na query string
      const response = await injectRequest(
        "GET",
        "/orders?campo_fantasma=teste",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);
      // Garante que o findMany foi chamado sem aplicar o filtro do campo fantasma
      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });
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


  describe("GET /orders (Filtros Dinâmicos e Tipagem)", () => {
    
    it("converte strings da URL para os tipos corretos (Int, Float, Enum) ao filtrar", async () => {
      // 1. Configura os mocks para responderem com sucesso
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      // 2. Simula o Frontend buscando na URL:
      // ?quantity=2 (Int) & price=85.50 (Float) & section=PENDENTE (Enum)
      const response = await injectRequest(
        "GET",
        "/orders?quantity=2&price=85.50&section=PENDENTE",
        undefined, // GET não tem payload/body
        authHeaderToken("OPERACIONAL")
      );

      // 3. Valida se a rota respondeu 200 OK
      expect(response.statusCode).toBe(200);

      // 4. A PROVA REAL: Verifica se o utilitário converteu as strings da URL em números puros
      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            quantity: 2,       // "2" virou o número inteiro 2
            price: 85.50,      // "85.50" virou o número float 85.5
            section: "PENDENTE" // Manteve o Enum correto
          }
        })
      );
    });

    it("ignora campos enviados na URL que não existem no banco de dados", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      // Simula alguém tentando injetar um filtro que não existe na tabela 'orders'
      const response = await injectRequest(
        "GET",
        "/orders?campo_fantasma=teste&outro_invalido=123",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);

      // Garante que o objeto 'where' enviado ao Prisma veio vazio {}, 
      // provando que o utilitário limpou os campos inválidos
      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

    it("ignora filtros que venham com valores vazios ou nulos na URL", async () => {
      orderRepository.findMany.mockResolvedValue([baseOrder]);
      orderRepository.count.mockResolvedValue(1);

      // Simula a URL quando o usuário limpa os campos de busca na tela
      const response = await injectRequest(
        "GET",
        "/orders?title=&section=&machine=",
        undefined,
        authHeaderToken("OPERACIONAL")
      );

      expect(response.statusCode).toBe(200);

      // Garante que strings vazias não foram mandadas como filtro para o Prisma
      expect(orderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

  });

