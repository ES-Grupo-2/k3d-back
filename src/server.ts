import Fastify from "fastify";
import "dotenv/config";

const app = Fastify({ logger: true });

app.setErrorHandler((error: any, _request, reply) => {
  const statusCode = error.statusCode ?? 500;
  const message    = error.message    ?? "Erro interno do servidor";
  if (statusCode === 500) app.log.error(error);
  return reply.status(statusCode).send({ error: message });
});

// ─── Rotas ────────────────────────────────────────────────────────────────

import { authRoutes } from "./modules/auth/auth.routes";
app.register(authRoutes, { prefix: "/auth" });

// ─── Start ────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`   Ambiente: ${NODE_ENV}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();