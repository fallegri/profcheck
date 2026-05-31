import { z } from "zod";

// Profession configuration schema with enhanced validation
export const configureProfessionSchema = z.object({
  professions: z
    .array(
      z.object({
        professionId: z.string().cuid("Invalid profession ID"),
        order: z.number().int().min(0, "Order must be non-negative"),
      })
    )
    .min(1, "At least one profession must be selected"),
});

export type ConfigureProfessionInput = z.infer<typeof configureProfessionSchema>;

// Profession image upload schema with enhanced validation
export const uploadProfessionImageSchema = z.object({
  professionId: z.string().cuid("Invalid profession ID"),
  imageUrl: z
    .string()
    .url("Invalid image URL")
    .refine(
      (url) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url),
      "Image URL must point to a valid image file (jpg, jpeg, png, gif, webp)"
    ),
});

export type UploadProfessionImageInput = z.infer<
  typeof uploadProfessionImageSchema
>;

// Profession ID schema
export const professionIdSchema = z.object({
  id: z.string().cuid("Invalid profession ID"),
});

export type ProfessionIdInput = z.infer<typeof professionIdSchema>;
