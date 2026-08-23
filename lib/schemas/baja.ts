import { z } from "zod";

export const bajaSchema = z.object({
  email: z.string().email(),
});
