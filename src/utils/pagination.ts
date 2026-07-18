import { z } from "zod";

export interface PaginationParams {
  page?: number | string;
  pageSize?: number | string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    pageSize: number;
    totalPages: number;
    currentPage: number;
  };
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(100, "O tamanho da página não pode ser maior que 100")
    .default(10),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export function paginateArray<T>(
  items: T[],
  params: { page: number; pageSize: number },
): PaginatedResult<T> {
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  const skip = (page - 1) * pageSize;

  const totalItems = items.length;
  const paginatedData = items.slice(skip, skip + pageSize);

  return {
    data: paginatedData,
    meta: {
      totalItems,
      itemCount: paginatedData.length,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page,
    },
  };
}

export interface PrismaModelDelegate<T, Args> {
  findMany(args?: Args): Promise<T[]>;
  count(args?: { where?: any }): Promise<number>;
}

export async function paginatePrisma<
  T,
  Args extends { where?: any; skip?: number; take?: number },
>(
  model: PrismaModelDelegate<T, Args>,
  args: Args,
  params: { page: number; pageSize: number },
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  const skip = (page - 1) * pageSize;

  const [data, totalItems] = await Promise.all([
    model.findMany({
      ...args,
      skip,
      take: pageSize,
    } as any),
    model.count({ where: args.where }),
  ]);

  return {
    data,
    meta: {
      totalItems,
      itemCount: data.length,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page,
    },
  };
}
