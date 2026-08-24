import ProductCard from "@karsa/ui/ProductCard.astro";

export default {
  title: "Commerce/ProductCard",
  component: ProductCard,
  parameters: { layout: "centered" },
};
export const InStock = {
  args: {
    id: 1,
    name: "Cangkir Stoneware",
    description: "Speckled stoneware for morning rituals.",
    price: "Rp 28.000",
    priceCents: 2800000,
    imageUrl: "/product-placeholder.webp",
    stock: 24,
    showAddToCart: true,
    category: "Ceramics",
  },
};
export const LowStock = {
  args: {
    id: 2,
    name: "Walnut Tray",
    description: "A warm landing place for the everyday.",
    price: "Rp 36.000",
    priceCents: 3600000,
    imageUrl: "/product-placeholder.webp",
    stock: 3,
    showAddToCart: true,
    category: "Tabletop",
  },
};
export const SoldOut = {
  args: {
    id: 3,
    name: "Glass Carafe",
    description: "Simple, clear, and quietly useful.",
    price: "Rp 42.000",
    priceCents: 4200000,
    imageUrl: "/product-placeholder.webp",
    stock: 0,
    showAddToCart: true,
    category: "Kitchen",
  },
};
