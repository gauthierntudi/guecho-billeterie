import { customAlphabet } from "nanoid";

const orderNumberAlphabet = customAlphabet("0123456789", 10);
const ticketCodeAlphabet = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  12,
);

export type FlexPayPaymentType = "1" | "2";

export type FlexPayInitiateResult =
  | {
      success: true;
      mode: "mobile";
      orderNumber: string;
      message: string;
      reference: string;
    }
  | {
      success: true;
      mode: "card";
      url: string;
      params: Record<string, string>;
      reference: string;
      orderNumber?: string;
    }
  | {
      success: false;
      error: string;
    };

export type FlexPayCallbackPayload = {
  code: string;
  reference?: string;
  provider_reference?: string;
  orderNumber?: string;
};

export type FlexPayCheckResult = {
  found: boolean;
  status?: "0" | "1";
  message?: string;
  transaction?: {
    orderNumber?: string;
    reference: string;
    amount: string;
    amountCustomer: string;
    currency: string;
    createdAt: string;
    status: string;
  };
};

export function generateOrderNumber() {
  return `GCH-${orderNumberAlphabet()}`;
}

export function generateTicketCode() {
  return ticketCodeAlphabet();
}

/** Référence unique FlexPay — évite "Transaction déjà traitée" */
export function generateFlexPayReference(orderNumber: string) {
  const shortTimestamp = String(Date.now()).slice(-4);
  return `${orderNumber.slice(0, 20)}-${shortTimestamp}`;
}

export function normalizeFlexPayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("243")) return digits;
  if (digits.startsWith("0")) return `243${digits.slice(1)}`;
  return `243${digits}`;
}

function getFlexPayConfig() {
  const merchant = process.env.FLEXPAIE_MERCHANT;
  const token = process.env.FLEXPAIE_TOKEN;
  const mobileApiUrl =
    process.env.FLEXPAIE_MOBILE_API_URL ??
    "https://backend.flexpay.cd/api/rest/v1/paymentService";
  const cardApiUrl =
    process.env.FLEXPAIE_CARD_API_URL ??
    "https://cardpayment.flexpay.cd/v1.1/pay";
  const checkApiUrl =
    process.env.FLEXPAIE_CHECK_API_URL ??
    "https://backend.flexpay.cd/api/rest/v1/check";
  const callbackUrl =
    process.env.FLEXPAIE_CALLBACK_URL ??
    `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/flexpaie/webhook`;

  return { merchant, token, mobileApiUrl, cardApiUrl, checkApiUrl, callbackUrl };
}

function authHeader(token: string) {
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

/** Token carte — FlexPay attend « Bearer … » (docs v1.1 / v2). */
function cardAuthToken(token: string) {
  const trimmed = token.trim();
  return /^Bearer\s+/i.test(trimmed) ? trimmed : `Bearer ${trimmed}`;
}

/** v1.1 et v2 : POST JSON → { url } ; v1 : formulaire HTML POST. */
function isCardJsonApi(cardApiUrl: string) {
  return /\/v1\.1\/|\/v2\//.test(cardApiUrl);
}

type InitiatePaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  flexPayPhone: string;
  description: string;
  paymentType: FlexPayPaymentType;
};

/**
 * FlexPay API v1.4 — Infoset Group
 * @see docs/docs.txt
 */
export async function initiateFlexPayPayment(
  input: InitiatePaymentInput,
): Promise<FlexPayInitiateResult> {
  const { merchant, token, mobileApiUrl, cardApiUrl, checkApiUrl, callbackUrl } =
    getFlexPayConfig();

  const reference = generateFlexPayReference(input.orderNumber);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!merchant || !token) {
    if (process.env.NODE_ENV === "development") {
      return {
        success: true,
        mode: "mobile",
        orderNumber: `DEMO-${input.orderNumber}`,
        message: "Mode démo — validez sur la page de confirmation",
        reference,
      };
    }
    return { success: false, error: "Configuration de paiement incomplète" };
  }

  const basePayload = {
    merchant,
    type: input.paymentType,
    reference,
    phone: normalizeFlexPayPhone(input.flexPayPhone),
    amount: String(input.amount),
    currency: input.currency,
    callbackUrl,
    description: input.description,
  };

  if (input.paymentType === "1") {
    try {
      const response = await fetch(mobileApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader(token),
        },
        body: JSON.stringify(basePayload),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur de communication (${response.status})`,
        };
      }

      const result = (await response.json()) as {
        code?: string;
        message?: string;
        orderNumber?: string;
      };

      if (result.code === "0" && result.orderNumber) {
        return {
          success: true,
          mode: "mobile",
          orderNumber: result.orderNumber,
          message: "Transaction envoyée. Veuillez valider le push message.",
          reference,
        };
      }

      return {
        success: false,
        error: "Erreur lors du paiement",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur lors du paiement",
      };
    }
  }

  // Type 2 — Carte bancaire
  const returnBase = `${appUrl}/confirmation/${input.orderId}`;
  const cardAuth = cardAuthToken(token);
  const cardFields = {
    merchant: basePayload.merchant,
    reference: basePayload.reference,
    amount: basePayload.amount,
    currency: basePayload.currency,
    description: basePayload.description,
    callback_url: callbackUrl,
    approve_url: `${returnBase}?status=success`,
    cancel_url: `${returnBase}?status=cancel`,
    decline_url: `${returnBase}?status=decline`,
    home_url: appUrl,
  };

  // v1.1 / v2 — POST JSON avec champ « token » (doc Card v1.1)
  if (isCardJsonApi(cardApiUrl)) {
    try {
      const response = await fetch(cardApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cardFields,
          token: cardAuth,
          authorization: cardAuth,
        }),
      });

      const result = (await response.json()) as {
        code?: string;
        message?: string;
        url?: string;
        orderNumber?: string;
      };

      if (result.code === "0" && result.url) {
        return {
          success: true,
          mode: "card",
          url: result.url,
          params: {},
          reference,
          orderNumber: result.orderNumber,
        };
      }

      return {
        success: false,
        error: result.message ?? "Erreur lors du paiement par carte",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur lors du paiement par carte",
      };
    }
  }

  // v1 — redirection formulaire HTML POST (champ « authorization »)
  const cardParams: Record<string, string> = {
    ...cardFields,
    type: basePayload.type,
    phone: basePayload.phone,
    authorization: cardAuth,
    Authorization: cardAuth,
  };

  return {
    success: true,
    mode: "card",
    url: cardApiUrl,
    params: cardParams,
    reference,
  };
}

/** Endpoints check — apicheck échoue (500) sur les paiements carte ; backend fonctionne pour les deux. */
function getCheckApiUrls(primary: string) {
  const normalized = primary.replace(/\/$/, "");
  const backend = "https://backend.flexpay.cd/api/rest/v1/check";
  return normalized === backend ? [backend] : [normalized, backend];
}

function parseCheckResponse(
  orderNumber: string,
  result: {
    code?: string;
    message?: string;
    transaction?: FlexPayCheckResult["transaction"];
  },
): FlexPayCheckResult {
  if (result.code === "0" && result.transaction) {
    const tx = result.transaction;
    return {
      found: true,
      status: tx.status === "0" ? "0" : "1",
      message: result.message,
      transaction: {
        ...tx,
        orderNumber: tx.orderNumber ?? orderNumber,
      },
    };
  }

  return {
    found: false,
    message: result.message ?? "Transaction introuvable",
  };
}

/** GET /api/rest/v1/check/{orderNumber} */
export async function checkFlexPayTransaction(
  orderNumber: string,
): Promise<FlexPayCheckResult> {
  const { token, checkApiUrl } = getFlexPayConfig();

  if (!token) {
    return { found: false, message: "Configuration de paiement incomplète" };
  }

  const headers = { Authorization: authHeader(token) };
  let lastMessage = "Transaction introuvable";

  for (const baseUrl of getCheckApiUrls(checkApiUrl)) {
    try {
      const response = await fetch(`${baseUrl}/${orderNumber}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        lastMessage = `Erreur HTTP ${response.status}`;
        continue;
      }

      const result = (await response.json()) as {
        code?: string;
        message?: string;
        transaction?: FlexPayCheckResult["transaction"];
      };

      const parsed = parseCheckResponse(orderNumber, result);
      if (parsed.found) {
        return parsed;
      }

      lastMessage = parsed.message ?? lastMessage;
    } catch (error) {
      lastMessage =
        error instanceof Error ? error.message : "Erreur vérification";
    }
  }

  return { found: false, message: lastMessage };
}

export function isFlexPayCallbackSuccess(payload: FlexPayCallbackPayload) {
  return payload.code === "0" && Boolean(payload.orderNumber);
}
