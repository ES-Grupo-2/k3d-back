import { S3Client } from "@aws-sdk/client-s3";

let instance: S3Client | null = null;

export const getMinioClient = (): S3Client => {
    if (!instance) {
        instance = new S3Client({
            endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
            region: "us-east-1",
            credentials: {
                accessKeyId: process.env.MINIO_ACCESS_KEY || "",
                secretAccessKey: process.env.MINIO_SECRET_KEY || "",
            },
            forcePathStyle: true,
        });
    }
    return instance;
};