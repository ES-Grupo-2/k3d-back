import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const clientRepository = vi.mocked(prisma.client);

// ── fixtures ──────────────────────────────────────────────────────────────────

const baseClient = {
  id: 1,
  name: "Acme Corp",
  created_at: new Date(),
  updated_at: new Date(),
};

const baseOrder = {
  id: 10,
  clientId: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

// ── helpers ───────────────────────────────────────────────────────────────────

function authToken(role: "GERENTE" | "OPERACIONAL" = "GERENTE") {
  return jwt.sign(
    { email: "manager@email.com", role },
    "test-secret",
    { subject: "99", expiresIn: "8h" },
  );
}

async function inject(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  url: string,
  token?: string,
  payload?: unknown,
) {
  const app = buildApp({ logger: false });
  try {
    return await app.inject({
      method,
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  } finally {
    await app.close();
  }
}

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

describe("clients routes", () => {

  // ── GET / ──────────────────────────────────────────────────────────────────

  describe("GET /clients", () => {
    it("returns 200 and a list of clients", async () => {
      clientRepository.findMany.mockResolvedValue([baseClient]);

      const response = await inject("GET", "/clients", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([{ id: 1, name: "Acme Corp" }]);
      expect(clientRepository.findMany).toHaveBeenCalledOnce();
    });

    it("returns 200 and an empty list when there are no clients", async () => {
      clientRepository.findMany.mockResolvedValue([]);

      const response = await inject("GET", "/clients", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("GET", "/clients");

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "Token não informado" });
      expect(clientRepository.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 when token is invalid", async () => {
      const response = await inject("GET", "/clients", "invalid-token");

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: "Token inválido" });
      expect(clientRepository.findMany).not.toHaveBeenCalled();
    });

    it("returns 200 for OPERACIONAL role (also allowed)", async () => {
      clientRepository.findMany.mockResolvedValue([baseClient]);

      const response = await inject("GET", "/clients", authToken("OPERACIONAL"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([{ id: 1, name: "Acme Corp" }]);
    });

    it("returns 200 and filters clients by search query", async () => {
      clientRepository.findMany.mockResolvedValue([baseClient]);

      const response = await inject("GET", "/clients?search=Acme", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([{ id: 1, name: "Acme Corp" }]);
      expect(clientRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: "Acme", mode: "insensitive" },
          },
        }),
      );
    });
  });

  // ── GET /with-orders ───────────────────────────────────────────────────────

  describe("GET /clients/with-orders", () => {
    it("returns 200 and clients with their orders", async () => {
      clientRepository.findMany.mockResolvedValue([
        { ...baseClient, orders: [baseOrder] },
      ]);

      const response = await inject("GET", "/clients/with-orders", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([
        { id: 1, name: "Acme Corp", orders: [{ id: 10 }] },
      ]);
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("GET", "/clients/with-orders");

      expect(response.statusCode).toBe(401);
      expect(clientRepository.findMany).not.toHaveBeenCalled();
    });

    it("returns 200 and filters clients with orders by search query", async () => {
      clientRepository.findMany.mockResolvedValue([
        { ...baseClient, orders: [baseOrder] },
      ]);

      const response = await inject("GET", "/clients/with-orders?search=Acme", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([
        { id: 1, name: "Acme Corp", orders: [{ id: 10 }] },
      ]);
      expect(clientRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: "Acme", mode: "insensitive" },
          },
        }),
      );
    });
  });

  // ── GET /:id ───────────────────────────────────────────────────────────────

  describe("GET /clients/:id", () => {
    it("returns 200 and the client when found", async () => {
      clientRepository.findUnique.mockResolvedValue(baseClient);

      const response = await inject("GET", "/clients/1", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, name: "Acme Corp" });
      expect(clientRepository.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it("returns 404 when client does not exist", async () => {
      clientRepository.findUnique.mockResolvedValue(null);

      const response = await inject("GET", "/clients/999", authToken());

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Cliente não encontrado" });
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("GET", "/clients/1");

      expect(response.statusCode).toBe(401);
      expect(clientRepository.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── GET /:id/with-orders ───────────────────────────────────────────────────

  describe("GET /clients/:id/with-orders", () => {
    it("returns 200 and the client with orders when found", async () => {
      clientRepository.findUnique.mockResolvedValue({
        ...baseClient,
        orders: [baseOrder],
      });

      const response = await inject(
        "GET",
        "/clients/1/with-orders",
        authToken(),
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: 1,
        orders: [{ id: 10 }],
      });
    });

    it("returns 404 when client does not exist", async () => {
      clientRepository.findUnique.mockResolvedValue(null);

      const response = await inject(
        "GET",
        "/clients/999/with-orders",
        authToken(),
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Cliente não encontrado" });
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("GET", "/clients/1/with-orders");

      expect(response.statusCode).toBe(401);
      expect(clientRepository.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── POST / ─────────────────────────────────────────────────────────────────

  describe("POST /clients", () => {
    it("returns 201 and the created client", async () => {

      clientRepository.findFirst.mockResolvedValue(null);
      clientRepository.create.mockResolvedValue({
        ...baseClient,
        id: 42,
        name: "New Client",
        phone: "11999999999",
        email: "new@email.com",
      });

      const validPayload = {
        name: "New Client",
        phone: "11999999999",
        email: "new@email.com",
      };

      const response = await inject(
        "POST",
        "/clients",
        authToken(),
        validPayload,
      );

      expect(response.statusCode).toBe(201);

      expect(response.json()).toMatchObject({
        id: 42,
        name: "New Client",
        phone: "11999999999",
        email: "new@email.com",
      });

      expect(clientRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Client",
            phone: "11999999999",
            email: "new@email.com",
          }),
        }),
      );
    });

    it("returns 400 for invalid body (missing name)", async () => {
      const response = await inject(
        "POST",
        "/clients",
        authToken(),
        {}, // empty body — name is required
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(clientRepository.create).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("POST", "/clients", undefined, {
        name: "New Client",
      });

      expect(response.statusCode).toBe(401);
      expect(clientRepository.create).not.toHaveBeenCalled();
    });

    it("returns 401 when token has an unrecognized role", async () => {
      const unknownRoleToken = jwt.sign(
        { email: "x@x.com", role: "FINANCEIRO" },
        "test-secret",
        { subject: "5", expiresIn: "8h" },
      );

      const response = await inject("POST", "/clients", unknownRoleToken, {
        name: "New Client",
      });

      expect(response.statusCode).toBe(401);
      expect(clientRepository.create).not.toHaveBeenCalled();
    });
  });

  // ── PATCH /:id ─────────────────────────────────────────────────────────────

  describe("PATCH /clients/:id", () => {
    it("returns 200 and the updated client", async () => {
      clientRepository.findUnique.mockResolvedValue(baseClient);
      clientRepository.update.mockResolvedValue({ ...baseClient, name: "Updated Corp" });

      const response = await inject(
        "PATCH",
        "/clients/1",
        authToken(),
        { name: "Updated Corp" },
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, name: "Updated Corp" });
      expect(clientRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: "Updated Corp" }),
        }),
      );
    });

    it("returns 404 when client does not exist", async () => {
      clientRepository.findUnique.mockResolvedValue(null);

      const response = await inject(
        "PATCH",
        "/clients/999",
        authToken(),
        { name: "Ghost" },
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Cliente não encontrado" });
      expect(clientRepository.update).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("PATCH", "/clients/1", undefined, {
        name: "X",
      });

      expect(response.statusCode).toBe(401);
      expect(clientRepository.update).not.toHaveBeenCalled();
    });
  });

  // ── DELETE /:id ────────────────────────────────────────────────────────────

  describe("DELETE /clients/:id", () => {
    it("returns 200 and a success message when client has no orders", async () => {
      clientRepository.findUnique.mockResolvedValue({
        ...baseClient,
        orders: [],
      });
      clientRepository.delete.mockResolvedValue(baseClient);

      const response = await inject("DELETE", "/clients/1", authToken());

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        message: "Cliente removido com sucesso",
      });
      expect(clientRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it("returns 400 when client has linked orders", async () => {
      clientRepository.findUnique.mockResolvedValue({
        ...baseClient,
        orders: [baseOrder],
      });

      const response = await inject("DELETE", "/clients/1", authToken());

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: "Não é possível remover um cliente com pedidos vinculados",
      });
      expect(clientRepository.delete).not.toHaveBeenCalled();
    });

    it("returns 404 when client does not exist", async () => {
      clientRepository.findUnique.mockResolvedValue(null);

      const response = await inject("DELETE", "/clients/999", authToken());

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Cliente não encontrado" });
      expect(clientRepository.delete).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("DELETE", "/clients/1");

      expect(response.statusCode).toBe(401);
      expect(clientRepository.delete).not.toHaveBeenCalled();
    });

    it("returns 401 when token has an unrecognized role", async () => {
      const unknownRoleToken = jwt.sign(
        { email: "x@x.com", role: "FINANCEIRO" },
        "test-secret",
        { subject: "5", expiresIn: "8h" },
      );

      const response = await inject("DELETE", "/clients/1", unknownRoleToken);

      expect(response.statusCode).toBe(401);
      expect(clientRepository.delete).not.toHaveBeenCalled();
    });
  });
});
