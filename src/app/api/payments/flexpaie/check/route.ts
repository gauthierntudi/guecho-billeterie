import { NextResponse } from "next/server";
import { isPrismaConnectionError } from "@/lib/db-retry";
import type { FlexPayCheckState } from "@/lib/flexpaie-polling";
import { getOrderById, reconcileFlexPayOrder } from "@/lib/ticketing";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get("orderNumber");
  const orderId = searchParams.get("orderId");

  if (!orderNumber) {
    return NextResponse.json(
      {
        state: "failed" satisfies FlexPayCheckState,
        status: "1",
        message: "orderNumber manquant",
      },
      { status: 400 },
    );
  }

  try {
    const localOrder = orderId ? await getOrderById(orderId) : null;

    if (localOrder?.status === "PAID") {
      return NextResponse.json({
        state: "success" satisfies FlexPayCheckState,
        status: "0",
        message: "Déjà payé",
      });
    }

    if (localOrder?.status === "CANCELLED") {
      return NextResponse.json({
        state: "cancelled" satisfies FlexPayCheckState,
        status: "1",
        message: "Commande annulée",
      });
    }

    if (
      localOrder?.flexpaieTransactionId &&
      localOrder.flexpaieTransactionId !== orderNumber
    ) {
      return NextResponse.json({
        state: "pending" satisfies FlexPayCheckState,
        status: "1",
        message: "Initialisation du paiement en cours",
      });
    }

    if (orderId) {
      try {
        await reconcileFlexPayOrder(orderId);
      } catch (error) {
        console.error("[flexpaie/check] reconcile failed:", error);
      }

      const updatedOrder = await getOrderById(orderId);

      if (updatedOrder?.status === "PAID") {
        return NextResponse.json({
          state: "success" satisfies FlexPayCheckState,
          status: "0",
          message: "Paiement confirmé",
        });
      }
    }

    return NextResponse.json({
      state: "pending" satisfies FlexPayCheckState,
      status: "1",
      message: "Confirmation du paiement en cours",
    });
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      return NextResponse.json(
        {
          state: "pending" satisfies FlexPayCheckState,
          status: "1",
          message: "Finalisation du paiement en cours",
        },
        { status: 503 },
      );
    }

    console.error("[flexpaie/check] unexpected error:", error);

    return NextResponse.json({
      state: "pending" satisfies FlexPayCheckState,
      status: "1",
      message: "Confirmation du paiement en cours",
    });
  }
}
