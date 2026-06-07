import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getMinioClient } from "../../lib/minIo";
import { FastifyUploadFile, UploadResponse } from "./files.types";

export class MinioService {
    private bucketName = process.env.MINIO_BUCKET || "k3d-files";
    private minioClient = getMinioClient();

    async uploadFile(file: FastifyUploadFile): Promise<UploadResponse> {
        const uniqueFileName = `${Date.now()}-${file.filename}`;

        try {
            console.log("Iniciando upload para o bucket:", this.bucketName);
            console.log("Nome do arquivo:", uniqueFileName);
            const uploadManager = new Upload({
                client: this.minioClient,
                params: {
                    Bucket: this.bucketName,
                    Key: uniqueFileName,
                    Body: file.file,
                    ContentType: file.mimetype,
                },
            });

            console.log("Enviando stream para o MinIO...")
            await uploadManager.done();
            console.log("Upload concluído com sucesso!");

            const fileUrl = `http://${process.env.MINIO_ENDPOINT}:9000/${this.bucketName}/${uniqueFileName}`;

            return {
                url: fileUrl,
                fileName: uniqueFileName,
                mimeType: file.mimetype,
            };
        } catch (error) {
            console.error("Erro ao fazer upload para o MinIO:", error);
            throw new Error("Não foi possível salvar o arquivo no servidor de armazenamento.");
        }
    }
    async getFile(fileName: string) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
            });

            const response = await this.minioClient.send(command);

            if (!response.Body) {
                throw new Error("Arquivo vazio ou não encontrado.");
            }

            return {
                stream: response.Body,
                contentType: response.ContentType || "application/octet-stream",
            };
        } catch (error) {
            console.error(`Erro ao buscar o arquivo ${fileName} no MinIO:`, error);
            throw new Error("Arquivo não encontrado no servidor de armazenamento.");
        }
    }

    async deleteFile(fileName: string): Promise<{ message: string }> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: fileName,
            });

            await this.minioClient.send(command);

            return { message: `Arquivo ${fileName} deletado com sucesso.` };
        } catch (error) {
            console.error(`Erro ao deletar o arquivo ${fileName} no MinIO:`, error);
            throw new Error("Não foi possível excluir o arquivo do servidor.");
        }
    }
}