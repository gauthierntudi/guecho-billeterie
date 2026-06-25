import { parsePhoneNumber } from "libphonenumber-js";

export function normalizeStoredPhone(phone: string) {
  try {
    const parsed = parsePhoneNumber(phone);
    if (parsed?.isValid()) {
      return parsed.format("E.164");
    }
  } catch {
    // keep raw value when parsing fails
  }

  return phone.trim();
}

export function getPhoneLookupVariants(phone: string) {
  const variants = new Set<string>();
  const trimmed = phone.trim();

  if (trimmed) {
    variants.add(trimmed);
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);

    if (digits.startsWith("243")) {
      variants.add(`0${digits.slice(3)}`);
    }

    if (digits.startsWith("0")) {
      variants.add(`243${digits.slice(1)}`);
      variants.add(`+243${digits.slice(1)}`);
    }
  }

  try {
    const parsed = parsePhoneNumber(trimmed);
    if (parsed) {
      variants.add(parsed.format("E.164"));
      variants.add(parsed.number);
      variants.add(parsed.nationalNumber);
      if (parsed.countryCallingCode) {
        variants.add(`${parsed.countryCallingCode}${parsed.nationalNumber}`);
        variants.add(`+${parsed.countryCallingCode}${parsed.nationalNumber}`);
      }
    }
  } catch {
    // ignore invalid numbers; validation happens upstream
  }

  return [...variants].filter(Boolean);
}
