import { defineModule, type ModuleDefinition } from "@karsa/core";

export { orderMessages } from "./messages";

export type OrdersPresentation = "orders" | "inquiries";
export interface OrdersOptions {
  presentation: OrdersPresentation;
}

/** Orders remain the backwards-compatible default for `karsa add orders`. */
export function orders(
  { presentation }: OrdersOptions = { presentation: "orders" },
): ModuleDefinition {
  const inquiries = presentation === "inquiries";
  return defineModule({
    name: "orders",
    requires: ["catalog"],
    clientConfig: { presentation },
    requiredBrandFields: ["currency"],
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
      {
        name: "security-hardening",
        url: new URL("../migrations/0004_security_hardening.sql", import.meta.url),
      },
    ],
    adminNav: [
      {
        label: inquiries ? "Inquiries" : "Orders",
        labelByLocale: inquiries
          ? { id: "Permintaan", en: "Inquiries" }
          : { id: "Pesanan", en: "Orders" },
        descriptionByLocale: inquiries
          ? { id: "Pantau permintaan layanan.", en: "Track service inquiries." }
          : { id: "Pantau pesanan dan pembayaran.", en: "Track orders and payments." },
        href: inquiries ? "/admin/inquiries" : "/admin/orders",
        icon: "orders",
        order: 20,
      },
    ],
    ambientScripts: inquiries ? [] : ["@karsa/orders/components/cart/CartScript.astro"],
    siteRoutes: inquiries
      ? []
      : [
          { pattern: "/cart", entrypoint: "@karsa/orders/routes/cart.astro" },
          { pattern: "/checkout", entrypoint: "@karsa/orders/routes/checkout.astro" },
          { pattern: "/api/orders/proof", entrypoint: "@karsa/orders/routes/api/orders/proof.ts" },
          {
            pattern: "/api/payment-proofs/[...key]",
            entrypoint: "@karsa/orders/routes/api/payment-proofs/[...key].ts",
          },
          { pattern: "/api/cart/lines", entrypoint: "@karsa/orders/routes/api/cart/lines.ts" },
        ],
    adminRoutes: [
      {
        pattern: inquiries ? "/admin/inquiries" : "/admin/orders",
        entrypoint: inquiries
          ? "@karsa/orders/routes/admin/inquiries.astro"
          : "@karsa/orders/routes/admin/orders.astro",
      },
      {
        pattern: "/admin/api/orders/[id]",
        entrypoint: "@karsa/orders/routes/api/admin/orders/[id].ts",
      },
    ],
    adminDashboardWidgets: inquiries
      ? []
      : [
          {
            id: "orders-overview",
            entrypoint: "@karsa/orders/components/admin/OrdersDashboardWidget.astro",
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
  type CreateOrderOptions,
  claimPaymentProof,
  completePaymentProof,
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
  releasePaymentProofClaim,
  updateOrderStatus,
} from "./orders";
