import { defineModule, type ModuleDefinition } from "@tokotuku/core";

export { orderMessages } from "./messages";

export function orders(): ModuleDefinition {
  return defineModule({
    name: "orders",
    requires: ["catalog"],
    migrations: [
      { name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) },
      {
        name: "payments-bank-transfer",
        url: new URL("../migrations/0002_payments_bank_transfer.sql", import.meta.url),
      },
    ],
    adminNav: [
      {
        label: "Orders",
        labelByLocale: { id: "Pesanan", en: "Orders" },
        descriptionByLocale: {
          id: "Pantau pesanan dan pembayaran.",
          en: "Track orders and payments.",
        },
        href: "/admin/orders",
        icon: "orders",
        order: 20,
      },
    ],
    ambientScripts: ["@tokotuku/orders/routes/CartScript.astro"],
    storefrontRoutes: [
      { pattern: "/cart", entrypoint: "@tokotuku/orders/routes/cart.astro" },
      { pattern: "/checkout", entrypoint: "@tokotuku/orders/routes/checkout.astro" },
      { pattern: "/api/orders/proof", entrypoint: "@tokotuku/orders/routes/api/orders/proof.ts" },
      {
        pattern: "/api/payment-proofs/[...key]",
        entrypoint: "@tokotuku/orders/routes/api/payment-proofs/[...key].ts",
      },
      { pattern: "/api/cart/lines", entrypoint: "@tokotuku/orders/routes/api/cart/lines.ts" },
    ],
    adminRoutes: [
      { pattern: "/admin/orders", entrypoint: "@tokotuku/orders/routes/admin/orders.astro" },
    ],
    adminDashboardWidgets: [
      {
        id: "orders-overview",
        entrypoint: "@tokotuku/orders/routes/admin/OrdersDashboardWidget.astro",
        area: "main",
        order: 30,
      },
    ],
  });
}

export {
  approvePayment,
  attachPaymentProof,
  createOrder,
  findCustomerOrder,
  getOrderDashboardSummary,
  listOrders,
  type OrderStatus,
  orderStatuses,
  type PaymentMethod,
  paymentMethods,
  updateOrderStatus,
} from "./orders";
