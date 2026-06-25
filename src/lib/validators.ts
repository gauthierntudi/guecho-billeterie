import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const cartItemSchema = z.object({
  ticketTypeId: z.string().cuid(),
  quantity: z.number().int().min(1).max(20),
});

const phoneField = z
  .string()
  .min(1, "Téléphone requis")
  .refine((value) => isValidPhoneNumber(value), {
    message: "Numéro de téléphone invalide",
  });

export const createOrderSchema = z
  .object({
    eventSlug: z.string().min(1),
    customerName: z.string().min(2).max(120),
    customerEmail: z.string().trim(),
    customerPhone: phoneField,
    paymentPhone: z.string().optional(),
    paymentType: z.enum(["1", "2"]).default("1"),
    currency: z.enum(["USD", "CDF"]).default("CDF"),
    items: z.array(cartItemSchema).min(1),
  })
  .superRefine((data, ctx) => {
    if (data.paymentType === "1") {
      if (!data.paymentPhone || !isValidPhoneNumber(data.paymentPhone)) {
        ctx.addIssue({
          code: "custom",
          path: ["paymentPhone"],
          message: "Numéro Mobile Money invalide",
        });
      }
      return;
    }

    const email = data.customerEmail.trim();
    if (!email || !z.email().safeParse(email).success) {
      ctx.addIssue({
        code: "custom",
        path: ["customerEmail"],
        message: "Email requis pour le paiement par carte",
      });
    }
  });

export const flexpayCallbackSchema = z.object({
  code: z.union([z.string(), z.number()]).transform(String),
  reference: z.string().optional(),
  provider_reference: z.string().optional(),
  orderNumber: z.string().optional(),
});

export const ticketLookupSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const phone = data.phone?.trim() ?? "";
    const email = data.email?.trim() ?? "";
    const hasValidPhone = phone.length > 0 && isValidPhoneNumber(phone);
    const hasValidEmail = email.length > 0 && z.email().safeParse(email).success;

    if (!hasValidPhone && !hasValidEmail) {
      ctx.addIssue({
        code: "custom",
        message: "Téléphone ou email invalide",
      });
    }
  });
