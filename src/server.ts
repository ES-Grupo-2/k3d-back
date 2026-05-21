import { buildApp } from "./app";

const app = buildApp({
  logger: true,
});

const start = async () => {
  try {
    await app.listen({
      port: Number(process.env.PORT) || 3333,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
