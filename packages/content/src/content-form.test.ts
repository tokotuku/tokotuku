import { describe, expect, it, vi } from "vitest";
import { postInputFromForm } from "./content-form";

describe("postInputFromForm", () => {
  it("stores a cover beneath content/ with cache and custom metadata", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const media = { put } as unknown as Parameters<typeof postInputFromForm>[1];
    const form = new FormData();
    form.set("title", "A Fresh Story");
    form.set("excerpt", "A short introduction.");
    form.set("body_markdown", "# Hello");
    form.set("status", "published");
    form.set("cover_image", new File(["image"], "cover.jpg", { type: "image/jpeg" }));

    const input = await postInputFromForm(form, media, null, "author-1");

    expect(input.slug).toBe("a-fresh-story");
    expect(input.status).toBe("published");
    expect(input.authorId).toBe("author-1");
    expect(input.coverImageKey).toMatch(/^content\/[0-9a-f-]+\.jpg$/);
    expect(put).toHaveBeenCalledWith(
      input.coverImageKey,
      expect.any(ArrayBuffer),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({ contentType: "image/jpeg" }),
        customMetadata: { purpose: "content-cover" },
      }),
    );
  });

  it("does not require a cover and rejects unsupported uploads", async () => {
    const put = vi.fn();
    const media = { put } as unknown as Parameters<typeof postInputFromForm>[1];
    const form = new FormData();
    form.set("title", "Draft");
    form.set("body_markdown", "Text");
    const input = await postInputFromForm(form, media);
    expect(input.coverImageKey).toBeNull();
    expect(put).not.toHaveBeenCalled();

    form.set("cover_image", new File(["not an image"], "payload.svg", { type: "image/svg+xml" }));
    await expect(postInputFromForm(form, media)).rejects.toThrow(/supported image/i);
  });
});
