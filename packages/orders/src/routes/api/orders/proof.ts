import { env } from "cloudflare:workers";
import { extensionForMediaType, isPaymentProofType } from "@karsa/core";
import type { APIRoute } from "astro";
import { claimPaymentProof, completePaymentProof, releasePaymentProofClaim } from "../../../orders";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const { user } = locals;
  if (!user) return redirect("/login?next=/checkout");

  const form = await request.formData();
  const orderNumber = String(form.get("orderNumber") ?? "").trim();
  const proof = form.get("proof");
  const backTo = `/checkout?order=${encodeURIComponent(orderNumber)}`;
  let claimedProofKey: string | null = null;
  let replacedProofKey: string | null = null;

  try {
    if (!orderNumber) throw new Error("Order tidak valid.");
    if (!(proof instanceof File) || proof.size === 0)
      throw new Error("Bukti transfer wajib diunggah.");
    if (!isPaymentProofType(proof.type))
      throw new Error("Bukti transfer harus berupa gambar atau PDF.");
    if (proof.size > 5 * 1024 * 1024) throw new Error("Ukuran file maksimal 5 MB.");

    const extension = extensionForMediaType(proof.type);
    const proofKey = `${orderNumber}/${crypto.randomUUID()}.${extension}`;
    const claim = await claimPaymentProof(env.DB, orderNumber, user.id, proofKey);
    claimedProofKey = proofKey;
    replacedProofKey = claim.replacedProofKey;
    await env.MEDIA.put(`payment-proofs/${proofKey}`, await proof.arrayBuffer(), {
      httpMetadata: { contentType: proof.type },
    });
    await completePaymentProof(env.DB, orderNumber, user.id, proofKey);
    // The new row is durable before the stale object is removed. A failed
    // cleanup must not roll the ready upload back to an empty claim.
    if (replacedProofKey) {
      await env.MEDIA.delete(`payment-proofs/${replacedProofKey}`).catch(() => undefined);
    }
  } catch (caught) {
    if (claimedProofKey) {
      await Promise.allSettled([
        releasePaymentProofClaim(env.DB, orderNumber, user.id, claimedProofKey),
        env.MEDIA.delete(`payment-proofs/${claimedProofKey}`),
      ]);
    }
    const message = caught instanceof Error ? caught.message : "Gagal menyimpan bukti transfer.";
    return redirect(`${backTo}&proofError=${encodeURIComponent(message)}`);
  }

  return redirect(backTo);
};
