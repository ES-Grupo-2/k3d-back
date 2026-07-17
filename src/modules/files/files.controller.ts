import { FastifyReply, FastifyRequest } from "fastify";
import path from "path";
import { Readable } from "stream";
import { FilesService } from "./files.service";
import { FastifyUploadFile } from "./files.types";

const filesService = new FilesService();

export class FilesController {

    async handleUpload(req: FastifyRequest, res: FastifyReply) {
        try {
            const data = await req.file();

            if (!data) {
                return res.status(400).send({ error: "Nenhum arquivo foi enviado." });
            }

            const allowedExtensions = [".stl", ".gcode", ".3mf", ".png", ".jpg", ".jpeg"];
            const fileExt = path.extname(data.filename).toLowerCase();
            if (!allowedExtensions.includes(fileExt)) {
                return res.status(400).send({
                    error: `Formato de arquivo não suportado: ${fileExt}. Formatos aceitos: ${allowedExtensions.join(", ")}`
                });
            }

            const MAX_SIZE = 50 * 1024 * 1024;
            const contentLength = Number(req.headers["content-length"]);
            if (contentLength > MAX_SIZE) {
                return res.status(400).send({
                    error: `Arquivo excede o limite de 50MB.`
                });
            }

            const result = await filesService.uploadFile(data);

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

            const { stream, contentType } = await filesService.getFile(fileName);

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

            const result = await filesService.deleteFile(fileName);

            return res.status(200).send(result);
        } catch (error) {
            console.error("Erro no handleDelete:", error);
            return res.status(500).send({ error: "Erro interno ao deletar o arquivo." });
        }
    }
}
