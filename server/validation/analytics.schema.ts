import "server-only";
import { z } from "zod";

export const analyticsQuerySchema = z.object({
  rango: z.enum(["7d", "28d", "90d"]).default("28d"),
});
