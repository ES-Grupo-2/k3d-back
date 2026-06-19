import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import type { Order } from "../../src/generated/prisma";
import { prisma } from "../../src/lib/clientPrisma";

type KanbanTask = Order & {
  tag: {
    id: number;
    type: string;
  };
  client: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
  };
};

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const orderRepository = vi.mocked(prisma.order);

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

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "8h";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("kanban routes", () => {
  describe("GET /kanban/sections/:taskStatus", () => {
    it("returns 200 and the tasks for a valid section", async () => {
      const updatedAt = new Date("2026-05-29T10:00:00.000Z");
      const createdAt = new Date("2026-05-28T10:00:00.000Z");
      const tasks: KanbanTask[] = [
        {
          id: 1,
          title: "Chaveiro do Luffy",
          section: "PENDENTE",
          status: "AGUARDANDO_IMPRESSAO",
          archive: "linkdoarquivo.sdfsha",
          price: 8,
          amount_paid: 8,
          cost: null,
          quantity: 1,
          payment_method: null,
          created_at: createdAt,
          updated_at: updatedAt,
          tagType: "CHAVEIRO",
          clientId: 1,
          tag: {
            id: 1,
            type: "CHAVEIRO",
          },
          client: {
            id: 1,
            name: "Cliente teste",
            phone: "4002-8922",
            email: "cliente@email.com",
          },
        },
      ];
      orderRepository.findMany.mockResolvedValue(tasks);

      const response = await injectGet(
        "/kanban/sections/PENDENTE",
        authToken("OPERACIONAL"),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        taskStatus: "PENDENTE",
        tasks: [
          {
            ...tasks[0],
            created_at: createdAt.toISOString(),
            updated_at: updatedAt.toISOString(),
          },
        ],
      });
      expect(orderRepository.findMany).toHaveBeenCalledWith({
        where: {
          section: "PENDENTE",
        },
        include: {
          tag: true,
          client: true,
        },
        orderBy: {
          updated_at: "desc",
        },
      });
    });

    it("allows managers to read section tasks", async () => {
      orderRepository.findMany.mockResolvedValue([]);

      const response = await injectGet(
        "/kanban/sections/FAZENDO",
        authToken("GERENTE"),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        taskStatus: "FAZENDO",
        tasks: [],
      });
    });

    it("returns 400 for an invalid section", async () => {
      const response = await injectGet(
        "/kanban/sections/CANCELADO",
        authToken("OPERACIONAL"),
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        error: "Dados inválidos",
      });
      expect(orderRepository.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 when authorization token is missing", async () => {
      const response = await injectGet("/kanban/sections/PENDENTE");

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "Token não informado",
      });
      expect(orderRepository.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 when authorization token is invalid", async () => {
      const response = await injectGet(
        "/kanban/sections/PENDENTE",
        "invalid-token",
      );

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        error: "Token inválido",
      });
      expect(orderRepository.findMany).not.toHaveBeenCalled();
    });
  });
});
