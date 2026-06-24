import { FastifyRequest, FastifyReply } from "fastify";
import {
  createTagSchema,
  updateTagSchema,
  tagIdParamSchema,
} from "./tags.types";
import { TagsService } from "./tags.service";

export class TagsController {
  static async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createTagSchema.parse(request.body);
    const tag = await TagsService.create(data);
    return reply.status(201).send(tag);
  }

  static async findAll(_request: FastifyRequest, reply: FastifyReply) {
    const tags = await TagsService.findAll();
    return reply.send(tags);
  }

  static async findById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = tagIdParamSchema.parse(request.params);
    const tag = await TagsService.findById(id);
    return reply.send(tag);
  }

  static async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = tagIdParamSchema.parse(request.params);
    const data = updateTagSchema.parse(request.body);
    const tag = await TagsService.update(id, data);
    return reply.send(tag);
  }
}
