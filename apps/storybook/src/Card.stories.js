import Card from "@tokotuku-starter/ui/Card.astro";

export default {
  title: "Core/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
};

export const Default = {
  args: {
    slots: {
      media:
        '<div style="display:grid;min-height:9rem;place-items:center;background:var(--tk-color-bg-subtle)">Product image</div>',
      default: "<h2>Everyday widget</h2><p>Reliable, compact, and ready for daily use.</p>",
      footer: "Available now",
    },
  },
};

export const WithoutMedia = {
  args: {
    slots: {
      default: "<h2>Simple card</h2><p>A card can contain body content only.</p>",
      footer: "Supporting information",
    },
  },
};
