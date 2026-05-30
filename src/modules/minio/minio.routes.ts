import { FastifyInstance } from "fastify";
import { verifyJWT } from "../../middlewares/auth";
import { MinioController } from "./minio.controller";

const minioController = new MinioController();

export async function minioRoutes(app: FastifyInstance) {
    app.addHook("preHandler", verifyJWT);

    app.post("/",
        minioController.handleUpload
    );

    app.get("/:fileName",
        minioController.handleGet
    );

    app.delete("/:fileName",
        minioController.handleDelete
    );
}