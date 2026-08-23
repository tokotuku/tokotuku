import { env } from "cloudflare:workers";
import { findBookingByOrderId } from "../../../../bookings";

export async function GET({ params }: { params: Record<string, string | undefined> }) {
  const orderId = Number(params["orderId"]);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return Response.json({ error: "Invalid booking id" }, { status: 400 });
  }
  const booking = await findBookingByOrderId(env.DB, orderId);
  if (!booking) return Response.json({ error: "Booking not found" }, { status: 404 });
  return Response.json(booking);
}
