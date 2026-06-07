import { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "stream";
import { MinioService } from "./files.service";
import { FastifyUploadFile } from "./files.types";

const minioService = new MinioService();

export class MinioController {

    async handleUpload(req: FastifyRequest, res: FastifyReply) {
        try {
            const data = await req.file();

            if (!data) {
                return res.status(400).send({ error: "Nenhum arquivo foi enviado." });
            }

            const result = await minioService.uploadFile(data as unknown as FastifyUploadFile);

            return res.status(201).send(result);
        } catch (error) {
            console.error("Erro no handleUpload:", error);
            return res.status(500).send({ error: "Erro interno ao processar o upload." });
        }
    }

    async handleGet(req: FastifyRequest, res: FastifyReply) {
        try {
            const { fileName } = req.params as { fileName: string };

            if (!fileName) {
                return res.status(400).send({ error: "Nome do arquivo não informado." });
            }

            const { stream, contentType } = await minioService.getFile(fileName);

            res.header("Content-Type", contentType);

            return res.send(stream as Readable);
        } catch (error) {
            console.error("Erro no handlerGet:", error);
            return res.status(404).send({ error: "Arquivo não encontrado." });
        }
    }

    async handleDelete(req: FastifyRequest, res: FastifyReply) {
        try {
            const { fileName } = req.params as { fileName: string };

            if (!fileName) {
                return res.status(400).send({ error: "Nome do arquivo não informado." });
            }

            const result = await minioService.deleteFile(fileName);

            return res.status(200).send(result);
        } catch (error) {
            console.error("Erro no handleDelete:", error);
            return res.status(500).send({ error: "Erro interno ao deletar o arquivo." });
        }
    }
}