import { describe, expect, it, vi } from "vitest";
import { paginateArray, paginatePrisma } from "../../src/utils/pagination";

describe("Pagination Utility", () => {
  describe("paginateArray", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    it("correctly paginates the first page of an array", () => {
      const result = paginateArray(items, { page: 1, pageSize: 5 });

      expect(result.data).toEqual([1, 2, 3, 4, 5]);
      expect(result.meta).toEqual({
        totalItems: 15,
        itemCount: 5,
        pageSize: 5,
        totalPages: 3,
        currentPage: 1,
      });
    });

    it("correctly paginates a middle page of an array", () => {
      const result = paginateArray(items, { page: 2, pageSize: 5 });

      expect(result.data).toEqual([6, 7, 8, 9, 10]);
      expect(result.meta).toEqual({
        totalItems: 15,
        itemCount: 5,
        pageSize: 5,
        totalPages: 3,
        currentPage: 2,
      });
    });

    it("handles the last page with remaining items less than pageSize", () => {
      const result = paginateArray(items, { page: 4, pageSize: 4 });

      expect(result.data).toEqual([13, 14, 15]);
      expect(result.meta).toEqual({
        totalItems: 15,
        itemCount: 3,
        pageSize: 4,
        totalPages: 4,
        currentPage: 4,
      });
    });

    it("handles a page index beyond the total pages", () => {
      const result = paginateArray(items, { page: 10, pageSize: 5 });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        totalItems: 15,
        itemCount: 0,
        pageSize: 5,
        totalPages: 3,
        currentPage: 10,
      });
    });

    it("handles empty arrays", () => {
      const result = paginateArray([], { page: 1, pageSize: 10 });

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        totalItems: 0,
        itemCount: 0,
        pageSize: 10,
        totalPages: 0,
        currentPage: 1,
      });
    });
  });

  describe("paginatePrisma", () => {
    it("calls findMany and count on the model delegate with correct arguments", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const mockCount = vi.fn().mockResolvedValue(20);

      const mockModel = {
        findMany: mockFindMany,
        count: mockCount,
      };

      const queryArgs = {
        where: { role: "OPERACIONAL" },
        orderBy: { name: "asc" },
      };

      const result = await paginatePrisma(mockModel as any, queryArgs, {
        page: 3,
        pageSize: 5,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { role: "OPERACIONAL" },
        orderBy: { name: "asc" },
        skip: 10,
        take: 5,
      });

      expect(mockCount).toHaveBeenCalledWith({
        where: { role: "OPERACIONAL" },
      });

      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.meta).toEqual({
        totalItems: 20,
        itemCount: 2,
        pageSize: 5,
        totalPages: 4,
        currentPage: 3,
      });
    });
  });
});
