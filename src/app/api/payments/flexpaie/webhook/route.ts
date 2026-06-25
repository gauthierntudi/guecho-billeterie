import { NextResponse } from "next/server";
import { isFlexPayCallbackSuccess } from "@/lib/flexpaie";
import { fulfillOrder, getOrderByFlexPayCallback } from "@/lib/ticketing";
import { flexpayCallbackSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: "ignored" }, { status: 400 });
  }

  const parsed = flexpayCallbackSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ status: "ignored" });
  }

  const data = parsed.data;

  if (!isFlexPayCallbackSuccess(data) || !data.orderNumber) {
    return NextResponse.json({ status: "ignored" });
  }

  const order = await getOrderByFlexPayCallback(
    data.orderNumber,
    data.reference,
  );

  if (!order) {
    return NextResponse.json({ status: "ignored" });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { flexpaieTransactionId: data.orderNumber },
  });

  await fulfillOrder(order.id, data.provider_reference ?? data.reference);

  return NextResponse.json({ status: "received" });
}
