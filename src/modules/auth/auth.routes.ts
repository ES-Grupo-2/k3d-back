import { FastifyInstance } from "fastify";
import { z } from "zod";

// ─── Schemas de validação ─────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(["GERENTE", "OPERACIONAL"]).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── Helper de validação ──────────────────────────────────────────────────

function validate(schema: z.ZodSchema, target: "body" | "params" | "query") {
  return async (request: any, reply: any) => {
    const result = schema.safeParse(request[target]);
    if (!result.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: result.error.flatten()
      });
    }
    request[target] = result.data;
  };
}

// ─── Rotas ────────────────────────────────────────────────────────────────

export async function authRoutes(app: FastifyInstance) {

  // POST /auth/register
  app.post("/register", {
    preHandler: [validate(registerSchema, "body")]
  }, async (request: any, reply) => {
    return reply.status(201).send({
      message: "✓ Register OK",
      body: request.body
    });
  });

  // POST /auth/login
  app.post("/login", {
    preHandler: [validate(loginSchema, "body")]
  }, async (request: any, reply) => {
    return reply.send({
      message: "✓ Login OK",
      body: request.body
    });
  });

}