import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "8h";

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const orderRepository = vi.mocked(prisma.order) as any;

function authToken(role = "OPERACIONAL") {
  return jwt.sign(
    { email: "employee@email.com", role },
    process.env.JWT_SECRET!,
    { subject: "99", expiresIn: process.env.JWT_EXPIRES_IN as any }
  );
}

async function injectPatch(
  url: string,
  payload: any,
  token?: string
): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "PATCH",
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return response as any;
  } finally {
    await app.close();
  }
}

async function injectGet(url: string, token?: string): Promise<any> {
  const app = buildApp({ logger: false });
  try {
    const response = await app.inject({
      method: "GET",
      url,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    return response as any;
  } finally {
    await app.close();
  }
}

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
  clientId: 4,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RF-06 — Movimentação de Pedido entre Colunas do Kanban (Blackbox)", () => {
  it("TC-RF06-01 - Arrastar o card do pedido da seção 'A Fazer' (PENDENTE) para a seção 'Fazendo' (FAZENDO)", async () => {
    orderRepository.findUnique.mockResolvedValue({
      ...baseOrder,
      section: "PENDENTE",
    });
    orderRepository.update.mockResolvedValue({
      ...baseOrder,
      section: "FAZENDO",
    });

    const response = await injectPatch(
      "/orders/1/move",
      { destinationSection: "FAZENDO" },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 1,
      section: "FAZENDO",
    });
  });

  it("TC-RF06-02 - Acionar o botão de mover o pedido da seção 'Fazendo' (FAZENDO) para a seção 'Finalizado' (FINALIZADO)", async () => {
    orderRepository.findUnique.mockResolvedValue({
      ...baseOrder,
      section: "FAZENDO",
    });
    orderRepository.update.mockResolvedValue({
      ...baseOrder,
      section: "FINALIZADO",
    });

    const response = await injectPatch(
      "/orders/1/move",
      { destinationSection: "FINALIZADO" },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 1,
      section: "FINALIZADO",
    });
  });

  it("TC-RF06-03 - Mover o pedido diretamente de 'A Fazer' (PENDENTE) para 'Finalizado' (FINALIZADO)", async () => {
    orderRepository.findUnique.mockResolvedValue({
      ...baseOrder,
      section: "PENDENTE",
    });
    orderRepository.update.mockResolvedValue({
      ...baseOrder,
      section: "FINALIZADO",
    });

    const response = await injectPatch(
      "/orders/1/move",
      { destinationSection: "FINALIZADO" },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 1,
      section: "FINALIZADO",
    });
  });

  it("TC-RF06-04 - Mover o pedido de volta de 'Finalizado' (FINALIZADO) para 'A Fazer' (PENDENTE)", async () => {
    orderRepository.findUnique.mockResolvedValue({
      ...baseOrder,
      section: "FINALIZADO",
    });
    orderRepository.update.mockResolvedValue({
      ...baseOrder,
      section: "PENDENTE",
    });

    const response = await injectPatch(
      "/orders/1/move",
      { destinationSection: "PENDENTE" },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: 1,
      section: "PENDENTE",
    });
  });
});

describe("RF-07 — Visualização de Pedidos no Kanban (Blackbox)", () => {
  it("TC-RF07-01 - Carregar e organizar todos os pedidos cadastrados nas três seções do Kanban", async () => {
    const pendedTask = { ...baseOrder, id: 1, section: "PENDENTE" };
    const progressTask = { ...baseOrder, id: 2, section: "FAZENDO" };
    const finishedTask = { ...baseOrder, id: 3, section: "FINALIZADO" };

    // Executando consultas para todas as seções e validando o retorno de cada uma
    orderRepository.findMany.mockResolvedValueOnce([pendedTask]);
    let response = await injectGet("/kanban/sections/PENDENTE", authToken("OPERACIONAL"));
    expect(response.statusCode).toBe(200);
    expect(response.json().tasks[0].id).toBe(1);

    orderRepository.findMany.mockResolvedValueOnce([progressTask]);
    response = await injectGet("/kanban/sections/FAZENDO", authToken("OPERACIONAL"));
    expect(response.statusCode).toBe(200);
    expect(response.json().tasks[0].id).toBe(2);

    orderRepository.findMany.mockResolvedValueOnce([finishedTask]);
    response = await injectGet("/kanban/sections/FINALIZADO", authToken("OPERACIONAL"));
    expect(response.statusCode).toBe(200);
    expect(response.json().tasks[0].id).toBe(3);
  });

  it("TC-RF07-02 - Kanban vazio sem pedidos cadastrados", async () => {
    orderRepository.findMany.mockResolvedValue([]);

    const response = await injectGet("/kanban/sections/PENDENTE", authToken("OPERACIONAL"));

    expect(response.statusCode).toBe(200);
    expect(response.json().tasks).toEqual([]);
  });

  it("TC-RF07-03 - Validar exibição correta dos campos no card do pedido", async () => {
    const customTask = {
      ...baseOrder,
      title: "Chaveiro personalizado logo Kria3D",
      status: "Não Pago",
      tagType: "Chaveiro",
      tag: {
        id: 5,
        type: "Chaveiro",
      },
      client: {
        id: 10,
        name: "Renata Souza Lima",
        phone: "(83) 99999-1122",
        email: "renata.lima@gmail.com",
      },
    };
    orderRepository.findMany.mockResolvedValue([customTask]);

    const response = await injectGet("/kanban/sections/PENDENTE", authToken("OPERACIONAL"));

    expect(response.statusCode).toBe(200);
    const orderInResponse = response.json().tasks[0];
    expect(orderInResponse.title).toBe("Chaveiro personalizado logo Kria3D");
    expect(orderInResponse.client.name).toBe("Renata Souza Lima");
    expect(orderInResponse.status).toBe("Não Pago");
    expect(orderInResponse.tagType).toBe("Chaveiro");
  });
});
