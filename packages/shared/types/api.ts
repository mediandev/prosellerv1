import { z } from "zod";

export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    success: z.literal(true),
    data,
    meta: z.record(z.unknown()).optional(),
  });

export const PaginationMeta = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(500),
  total: z.number().int().min(0),
  total_pages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof PaginationMeta>;

export const ApiPaginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    success: z.literal(true),
    data: z.array(item),
    meta: PaginationMeta,
  });

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  trace_id: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ErrorCodes = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "RECEITAWS_TIMEOUT",
  "RECEITAWS_RATE_LIMITED",
  "RECEITAWS_INVALID_RESPONSE",
  "NATUREZA_MAPEAMENTO_INCOMPLETO",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof ErrorCodes>;
