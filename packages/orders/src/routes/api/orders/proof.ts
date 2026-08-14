import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { attachPaymentProof } from "../../../orders";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const { user } = locals;
  if (!user) return redirect("/login?next=/checkout");

  const form = await request.formData();
  const orderNumber = String(form.get("orderNumber") ?? "").trim();
  const proof = form.get("proof");
  const backTo = `/checkout?order=${encodeURIComponent(orderNumber)}`;

  try {
    if (!orderNumber) throw new Error("Order tidak valid.");
    if (!(proof instanceof File) || proof.size === 0)
      throw new Error("Bukti transfer wajib diunggah.");
    if (!proof.type.startsWith("image/") && proof.type !== "application/pdf")
      throw new Error("Bukti transfer harus berupa gambar atau PDF.");
    if (proof.size > 5 * 1024 * 1024) throw new Error("Ukuran file maksimal 5 MB.");

    const extension =
      proof.name
        .split(".")
        .pop()
        ?.replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase() || "bin";
    const proofKey = `${orderNumber}/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(`payment-proofs/${proofKey}`, await proof.arrayBuffer(), {
      httpMetadata: { contentType: proof.type },
    });
    await attachPaymentProof(env.DB, orderNumber, user.id, proofKey);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Gagal menyimpan bukti transfer.";
    return redirect(`${backTo}&proofError=${encodeURIComponent(message)}`);
  }

  return redirect(backTo);
};
