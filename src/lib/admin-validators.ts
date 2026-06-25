import { z } from "zod";

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
});

export const updateTicketTypeSchema = z.object({
  priceUsd: z.number().int().min(0).optional(),
  quantity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateOrderSchema = z.object({
  customerName: z.string().min(1, "Nom requis").optional(),
  customerEmail: z.string().email("Email invalide").optional(),
  customerPhone: z.string().min(1, "Téléphone requis").optional(),
});
