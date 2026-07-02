import { FastifyInstance } from "fastify";
import { verifyJWT } from "../../middlewares/auth";
import { FilesController } from "./files.controller";

const filesController = new FilesController();

export async function filesRoutes(app: FastifyInstance) {
    app.addHook("preHandler", verifyJWT);

    app.post("/",
        filesController.handleUpload
    );

    app.get("/:fileName",
        filesController.handleGet
    );

    app.delete("/:fileName",
        filesController.handleDelete
    );
}
