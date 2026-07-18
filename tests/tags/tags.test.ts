import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";
import { Prisma } from "@prisma/client";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const tagRepository = vi.mocked(prisma.tag);

// ── fixtures ──────────────────────────────────────────────────────────────────

const baseTag = { id: 1, type: "PLA" };

// ── helpers ───────────────────────────────────────────────────────────────────

function authToken(role: "GERENTE" | "OPERACIONAL" | "FINANCEIRO" = "GERENTE") {
  return jwt.sign(
    { email: "manager@email.com", role },
    "test-secret",
    { subject: "99", expiresIn: "8h" },
  );
}

async function inject(
  method: "GET" | "POST" | "PATCH",
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

function prismaUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
  });
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

describe("tags routes", () => {

  // ── GET /tags ──────────────────────────────────────────────────────────────

  describe("GET /tags", () => {
    it("returns 200 and a list of tags for GERENTE", async () => {
      tagRepository.findMany.mockResolvedValue([baseTag, { id: 2, type: "RESINA" }]);

      const response = await inject("GET", "/tags", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([
        { id: 1, type: "PLA" },
        { id: 2, type: "RESINA" },
      ]);
      expect(tagRepository.findMany).toHaveBeenCalledOnce();
    });

    it("returns 200 and a list of tags for OPERACIONAL", async () => {
      tagRepository.findMany.mockResolvedValue([baseTag]);

      const response = await inject("GET", "/tags", authToken("OPERACIONAL"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([{ id: 1, type: "PLA" }]);
    });

    it("returns 200 and an empty list when there are no tags", async () => {
      tagRepository.findMany.mockResolvedValue([]);

      const response = await inject("GET", "/tags", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("GET", "/tags");

      expect(response.statusCode).toBe(401);
      expect(tagRepository.findMany).not.toHaveBeenCalled();
    });
  });

  // ── GET /tags/:id ──────────────────────────────────────────────────────────

  describe("GET /tags/:id", () => {
    it("returns 200 and the tag when found", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);

      const response = await inject("GET", "/tags/1", authToken("GERENTE"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, type: "PLA" });
      expect(tagRepository.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("returns 200 for OPERACIONAL role (also allowed)", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);

      const response = await inject("GET", "/tags/1", authToken("OPERACIONAL"));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, type: "PLA" });
    });

    it("returns 404 when tag does not exist", async () => {
      tagRepository.findUnique.mockResolvedValue(null);

      const response = await inject("GET", "/tags/999", authToken("GERENTE"));

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Tag não encontrada" });
    });

    it("returns 400 when id is not numeric", async () => {
      const response = await inject("GET", "/tags/abc", authToken("GERENTE"));

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(tagRepository.findUnique).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("GET", "/tags/1");

      expect(response.statusCode).toBe(401);
      expect(tagRepository.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── POST /tags ─────────────────────────────────────────────────────────────

  describe("POST /tags", () => {
    it("returns 201 and the created tag", async () => {
      tagRepository.findUnique.mockResolvedValue(null);
      tagRepository.create.mockResolvedValue({ id: 3, type: "PETG" });

      const response = await inject(
        "POST",
        "/tags",
        authToken("GERENTE"),
        { type: "PETG" },
      );

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ id: 3, type: "PETG" });
      expect(tagRepository.create).toHaveBeenCalledWith({
        data: { type: "PETG" },
      });
    });

    it("returns 409 when type is already registered", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);

      const response = await inject(
        "POST",
        "/tags",
        authToken("GERENTE"),
        { type: "PLA" },
      );

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: "Tag já cadastrada" });
      expect(tagRepository.create).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid body (missing type)", async () => {
      const response = await inject("POST", "/tags", authToken("GERENTE"), {});

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(tagRepository.create).not.toHaveBeenCalled();
    });

    it("returns 400 for an empty type string", async () => {
      const response = await inject(
        "POST",
        "/tags",
        authToken("GERENTE"),
        { type: "   " },
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(tagRepository.create).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("POST", "/tags", undefined, { type: "PETG" });

      expect(response.statusCode).toBe(401);
      expect(tagRepository.create).not.toHaveBeenCalled();
    });

    it("returns 403 for OPERACIONAL role (not allowed to create tags)", async () => {
      const response = await inject(
        "POST",
        "/tags",
        authToken("OPERACIONAL"),
        { type: "PETG" },
      );

      expect(response.statusCode).toBe(403);
      expect(tagRepository.create).not.toHaveBeenCalled();
    });

    it("returns 401 for an unrecognized role", async () => {
      const response = await inject(
        "POST",
        "/tags",
        authToken("FINANCEIRO"),
        { type: "PETG" },
      );

      expect(response.statusCode).toBe(401);
      expect(tagRepository.create).not.toHaveBeenCalled();
    });
  });

  // ── PATCH /tags/:id ────────────────────────────────────────────────────────

  describe("PATCH /tags/:id", () => {
    it("returns 200 and the updated tag", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);
      tagRepository.update.mockResolvedValue({ id: 1, type: "PLA+" });

      const response = await inject(
        "PATCH",
        "/tags/1",
        authToken("GERENTE"),
        { type: "PLA+" },
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, type: "PLA+" });
      expect(tagRepository.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { type: "PLA+" },
      });
    });

    it("returns the existing tag without calling update when type is unchanged", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);

      const response = await inject(
        "PATCH",
        "/tags/1",
        authToken("GERENTE"),
        { type: "PLA" },
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, type: "PLA" });
      expect(tagRepository.update).not.toHaveBeenCalled();
    });

    it("returns the existing tag without calling update when body is empty", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);

      const response = await inject(
        "PATCH",
        "/tags/1",
        authToken("GERENTE"),
        {},
      );

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: 1, type: "PLA" });
      expect(tagRepository.update).not.toHaveBeenCalled();
    });

    it("returns 404 when tag does not exist", async () => {
      tagRepository.findUnique.mockResolvedValue(null);

      const response = await inject(
        "PATCH",
        "/tags/999",
        authToken("GERENTE"),
        { type: "PLA+" },
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Tag não encontrada" });
      expect(tagRepository.update).not.toHaveBeenCalled();
    });

    it("returns 409 when the new type collides with another existing tag (race condition)", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);
      tagRepository.update.mockRejectedValue(prismaUniqueConstraintError());

      const response = await inject(
        "PATCH",
        "/tags/1",
        authToken("GERENTE"),
        { type: "RESINA" },
      );

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: "Tag já cadastrada" });
    });

    it("returns 400 when id is not numeric", async () => {
      const response = await inject(
        "PATCH",
        "/tags/abc",
        authToken("GERENTE"),
        { type: "PLA+" },
      );

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "Dados inválidos" });
      expect(tagRepository.update).not.toHaveBeenCalled();
    });

    it("returns 401 when token is missing", async () => {
      const response = await inject("PATCH", "/tags/1", undefined, { type: "PLA+" });

      expect(response.statusCode).toBe(401);
      expect(tagRepository.update).not.toHaveBeenCalled();
    });

    it("returns 403 for OPERACIONAL role (not allowed to update tags)", async () => {
      const response = await inject(
        "PATCH",
        "/tags/1",
        authToken("OPERACIONAL"),
        { type: "PLA+" },
      );

      expect(response.statusCode).toBe(403);
      expect(tagRepository.update).not.toHaveBeenCalled();
    });

    it("returns 500 when update fails with a non-unique-constraint error", async () => {
      tagRepository.findUnique.mockResolvedValue(baseTag);
      tagRepository.update.mockRejectedValue(new Error("Database connection lost"));

      const response = await inject(
        "PATCH",
        "/tags/1",
        authToken("GERENTE"),
        { type: "RESINA" },
      );

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Erro interno do servidor" });
    });
  });
});
