import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";
import { prisma } from "../../src/lib/clientPrisma";

const { mockS3Send, mockDone } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
  mockDone: vi.fn(),
}));

vi.mock("@aws-sdk/lib-storage", () => {
  class MockUpload {
    done = mockDone;
  }
  return { Upload: MockUpload };
});

vi.mock("../../src/lib/filesClient", () => ({
  getFilesClient: vi.fn(() => ({
    send: mockS3Send,
  })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: class {},
  DeleteObjectCommand: class {},
}));

vi.mock("../../src/lib/clientPrisma", () => ({
  prisma: {
    order: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const orderRepository = vi.mocked(prisma.order) as any;

function authToken(role = "OPERACIONAL") {
  return jwt.sign(
    { email: "user@kria3d.com", role },
    "test-secret",
    { subject: "1", expiresIn: "8h" }
  );
}

async function injectMultipartFile(
  url: string,
  filename: string,
  contentType: string,
  contentSize = 1000,
  token?: string
) {
  const app = buildApp({ logger: false });
  const boundary = "----VitestBoundary12345";
  
  // Se contentSize for maior do que 50MB, podemos injetar uma string maior
  const fileContent = "A".repeat(contentSize);

  const payload = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: ${contentType}`,
    "",
    fileContent,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  try {
    return await app.inject({
      method: "POST",
      url,
      payload,
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
  } finally {
    await app.close();
  }
}

async function injectPostOrder(url: string, payload: any, token?: string) {
  const app = buildApp({ logger: false });
  try {
    return await app.inject({
      method: "POST",
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  } finally {
    await app.close();
  }
}

async function injectPutOrder(url: string, payload: any, token?: string) {
  const app = buildApp({ logger: false });
  try {
    return await app.inject({
      method: "PUT",
      url,
      payload,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  } finally {
    await app.close();
  }
}

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "8h";
  process.env.MINIO_BUCKET = "k3d-files";
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RF-17 — Upload de Arquivos 3D em Pedidos (Blackbox)", () => {
  it("TC-RF17-01 - Fazer upload de arquivo 'peca_suporte.stl' (5 MB) válido", async () => {
    mockDone.mockResolvedValue({ Bucket: "k3d-files", Key: "peca_suporte.stl" });

    // Tamanho aproximado de 5MB em bytes: 5 * 1024 * 1024
    const response = await injectMultipartFile(
      "/files",
      "peca_suporte.stl",
      "application/octet-stream",
      5 * 1024 * 1024,
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty("url");
    expect(mockDone).toHaveBeenCalled();
  });

  it("TC-RF17-02 - Fazer upload de arquivo 'impressao_final.gcode' (3 MB) válido", async () => {
    mockDone.mockResolvedValue({ Bucket: "k3d-files", Key: "impressao_final.gcode" });

    // Tamanho aproximado de 3MB em bytes: 3 * 1024 * 1024
    const response = await injectMultipartFile(
      "/files",
      "impressao_final.gcode",
      "application/octet-stream",
      3 * 1024 * 1024,
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty("url");
    expect(mockDone).toHaveBeenCalled();
  });

  it("TC-RF17-03 - Rejeitar formato de arquivo inválido 'modelo.obj'", async () => {
    const response = await injectMultipartFile(
      "/files",
      "modelo.obj",
      "application/octet-stream",
      1000,
      authToken("OPERACIONAL")
    );

    // O sistema deve rejeitar o formato não suportado (.obj) retornando 400
    expect(response.statusCode).toBe(400);
  });

  it("TC-RF17-04 - Rejeitar arquivo acima do limite permitido de 50 MB (ex: 50.1 MB)", async () => {
    // 50.1 MB em bytes
    const size50_1MB = 50.1 * 1024 * 1024;
    const response = await injectMultipartFile(
      "/files",
      "peca_grande.stl",
      "application/octet-stream",
      size50_1MB,
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(400);
  });

  it("TC-RF17-05 - Criar pedido sem arquivo anexado (upload não obrigatório)", async () => {
    orderRepository.create.mockResolvedValue({
      id: 50,
      title: "Chaveiro personalizado Kria3D",
      archive: null,
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    const response = await injectPostOrder(
      "/orders",
      {
        title: "Chaveiro personalizado Kria3D",
        price: 45.0,
        amount_paid: 0.0,
        quantity: 3,
        tagType: "PLA",
        client_id: 1,
      },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(201);
    expect(response.json().archive).toBeNull();
  });

  it("TC-RF17-06 - Anexar arquivo 'revisao_v2.stl' (2 MB) na edição de pedido que não tinha anexo", async () => {
    orderRepository.findUnique.mockResolvedValue({
      id: 50,
      title: "Chaveiro personalizado Kria3D",
      archive: null,
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    orderRepository.update.mockResolvedValue({
      id: 50,
      title: "Chaveiro personalizado Kria3D",
      archive: "revisao_v2.stl",
      price: 45.0,
      amount_paid: 0.0,
      quantity: 3,
      tagType: "PLA",
      clientId: 1,
    });

    const response = await injectPutOrder(
      "/orders/50",
      {
        archive: "revisao_v2.stl",
      },
      authToken("OPERACIONAL")
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().archive).toBe("revisao_v2.stl");
  });
});
