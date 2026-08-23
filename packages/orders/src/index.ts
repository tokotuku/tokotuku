import { defineModule, type ModuleDefinition } from "@takontuku/core";

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
      {
        name: "admin-cursor-indexes",
        url: new URL("../migrations/0003_admin_cursor_indexes.sql", import.meta.url),
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
    ambientScripts: ["@takontuku/orders/components/cart/CartScript.astro"],
    storefrontRoutes: [
      { pattern: "/cart", entrypoint: "@takontuku/orders/routes/cart.astro" },
      { pattern: "/checkout", entrypoint: "@takontuku/orders/routes/checkout.astro" },
      { pattern: "/api/orders/proof", entrypoint: "@takontuku/orders/routes/api/orders/proof.ts" },
      {
        pattern: "/api/payment-proofs/[...key]",
        entrypoint: "@takontuku/orders/routes/api/payment-proofs/[...key].ts",
      },
      { pattern: "/api/cart/lines", entrypoint: "@takontuku/orders/routes/api/cart/lines.ts" },
    ],
    adminRoutes: [
      { pattern: "/admin/orders", entrypoint: "@takontuku/orders/routes/admin/orders.astro" },
      {
        pattern: "/admin/api/orders/[id]",
        entrypoint: "@takontuku/orders/routes/api/admin/orders/[id].ts",
      },
    ],
    adminDashboardWidgets: [
      {
        id: "orders-overview",
        entrypoint: "@takontuku/orders/components/admin/OrdersDashboardWidget.astro",
        area: "main",
        order: 30,
      },
    ],
  });
}

export {
  type AdminOrder,
  type AdminOrderDetail,
  type AdminOrderItem,
  approvePayment,
  attachPaymentProof,
  createInquiryOrder,
  createOrder,
  findAdminOrderDetail,
  findCustomerOrder,
  getOrderDashboardSummary,
  type InquiryDetails,
  type ListOrdersOptions,
  listOrders,
  type OrderDashboardSummary,
  type OrderStatus,
  orderStatuses,
  orderTransitions,
  type PaymentMethod,
  paymentMethods,
  updateOrderStatus,
} from "./orders";
