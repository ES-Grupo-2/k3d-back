import { MultipartFile } from "@fastify/multipart";

export type FastifyUploadFile = MultipartFile;

export interface UploadResponse {
    url: string;
    fileName: string;
    mimeType: string;
}