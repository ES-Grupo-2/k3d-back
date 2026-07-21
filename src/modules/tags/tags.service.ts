import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/clientPrisma";
import { AppError } from "../../utils/errors";
import { CreateTagInput, TagResponse, UpdateTagInput } from "./tags.types";

export class TagsService {
  static async create(data: CreateTagInput): Promise<TagResponse> {
    const existing = await prisma.tag.findUnique({
      where: { type: data.type },
    });

    if (existing) {
      throw new AppError("Tag já cadastrada", 409);
    }

    return prisma.tag.create({
      data: {
         type: data.type,
         color: data.color ?? "#6366f1" 
        },
    });
  }

  static async findAll(): Promise<TagResponse[]> {
    return prisma.tag.findMany({
      orderBy: { type: "asc" },
    });
  }

  static async findById(id: number): Promise<TagResponse> {
    const tag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new AppError("Tag não encontrada", 404);
    }

    return tag;
  }

  static async update(id: number, data: UpdateTagInput): Promise<TagResponse> {
    const existing = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Tag não encontrada", 404);
    }

    if (!data.type || data.type === existing.type) {
      return existing;
    }

    try {
      return await prisma.tag.update({
        where: { id },
          data: {
          ...(data.type  && { type:  data.type }),
          ...(data.color && { color: data.color }),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("Tag já cadastrada", 409);
      }
      throw error;
    }
  }
}
