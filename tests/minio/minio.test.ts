import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app";

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

vi.mock("../../src/lib/minIo", () => ({
    getMinioClient: vi.fn(() => ({
        send: mockS3Send,
    })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
    GetObjectCommand: class { },
    DeleteObjectCommand: class { },
}));

function authToken(role = "GERENTE") {
    return jwt.sign(
        { email: "manager@email.com", role },
        "test-secret",
        { subject: "99", expiresIn: "8h" },
    );
}

async function injectMultipartFile(url: string, token?: string) {
    const app = buildApp({ logger: false });
    const boundary = "----VitestBoundary12345";
    const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="foto-teste.png"',
        "Content-Type: image/png",
        "",
        "conteudo_binario_fake",
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

async function injectStandardRequest(method: "GET" | "DELETE", url: string, token?: string) {
    const app = buildApp({ logger: false });
    try {
        return await app.inject({
            method,
            url,
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

describe("minio routes", () => {


    describe("POST /files", () => {
        it("returns 201 and the file metadata when upload succeeds", async () => {
            mockDone.mockResolvedValue({ Bucket: "k3d-files", Key: "foto-teste.png" });

            const response = await injectMultipartFile("/files", authToken("GERENTE"));

            expect(response.statusCode).toBe(201);
            expect(response.json()).toMatchObject({
                mimeType: "image/png",
            });
            expect(mockDone).toHaveBeenCalledTimes(1);
        });

        it("returns 401 when token is missing", async () => {
            const response = await injectMultipartFile("/files");
            expect(response.statusCode).toBe(401);
        });

        it("returns 500 when upload driver fails", async () => {
            mockDone.mockRejectedValue(new Error("Erro do S3"));

            const response = await injectMultipartFile("/files", authToken("GERENTE"));

            expect(response.statusCode).toBe(500);
            expect(response.json()).toEqual({ error: "Erro interno ao processar o upload." });
        });
    });

    describe("GET /files/:fileName", () => {
        it("returns 200 and the file stream when file exists", async () => {
            mockS3Send.mockResolvedValue({
                Body: "stream_de_dados_da_imagem_fake",
                ContentType: "image/png"
            });

            const response = await injectStandardRequest(
                "GET",
                "/files/12345-foto.png",
                authToken("OPERACIONAL")
            );

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toBe("image/png");
            expect(response.payload).toBe("stream_de_dados_da_imagem_fake");
            expect(mockS3Send).toHaveBeenCalledTimes(1);
        });

        it("returns 404 when file does not exist in MinIO", async () => {
            mockS3Send.mockRejectedValue(new Error("NoSuchKey"));

            const response = await injectStandardRequest("GET", "/files/arquivo-fantasma.png", authToken("OPERACIONAL"));

            expect(response.statusCode).toBe(404);
            expect(response.json()).toEqual({ error: "Arquivo não encontrado." });
        });
    });

    describe("DELETE /files/:fileName", () => {
        it("returns 200 when file is successfully deleted", async () => {
            mockS3Send.mockResolvedValue({});

            const response = await injectStandardRequest(
                "DELETE",
                "/files/12345-foto.png",
                authToken("GERENTE")
            );

            expect(response.statusCode).toBe(200);
            expect(response.json()).toHaveProperty("message");
            expect(mockS3Send).toHaveBeenCalledTimes(1);
        });

        it("returns 200 when an OPERACIONAL user deletes a file", async () => {
            mockS3Send.mockResolvedValue({});

            const response = await injectStandardRequest(
                "DELETE",
                "/files/12345-foto.png",
                authToken("OPERACIONAL")
            );

            expect(response.statusCode).toBe(200);
            expect(response.json()).toHaveProperty("message");
            expect(mockS3Send).toHaveBeenCalledTimes(1);
        });
    });
});