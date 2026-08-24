import { defineModule, type ModuleDefinition } from "@karsa/core";

export function booking(): ModuleDefinition {
  return defineModule({
    name: "booking",
    requires: ["catalog", "orders"],
    migrations: [
      { name: "init", url: new URL("../migrations/0001_init.sql", import.meta.url) },
      {
        name: "admin-cursor-indexes",
        url: new URL("../migrations/0002_admin_cursor_indexes.sql", import.meta.url),
      },
    ],
    adminNav: [
      {
        label: "Bookings",
        labelByLocale: { id: "Booking", en: "Bookings" },
        descriptionByLocale: {
          id: "Pantau permintaan booking yang masuk.",
          en: "Track incoming booking requests.",
        },
        href: "/admin/bookings",
        // @karsa/ui's icon set has no booking/calendar glyph yet, so
        // this ships its own raw path data rather than forcing an edit
        // there — see AdminNavItem.icon's doc comment.
        icon: [
          "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
          "M8 2v4",
          "M16 2v4",
          "M3 10h18",
        ],
        order: 25,
      },
      {
        label: "Schedules",
        labelByLocale: { id: "Jadwal", en: "Schedules" },
        descriptionByLocale: {
          id: "Atur ketersediaan layanan.",
          en: "Manage service availability.",
        },
        href: "/admin/schedules",
        icon: [
          "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
          "M8 2v4",
          "M16 2v4",
          "M3 10h18",
        ],
        order: 26,
      },
    ],
    siteRoutes: [
      { pattern: "/booking/[id]", entrypoint: "@karsa/booking/routes/booking/[id].astro" },
    ],
    adminRoutes: [
      { pattern: "/admin/bookings", entrypoint: "@karsa/booking/routes/admin/bookings.astro" },
      { pattern: "/admin/schedules", entrypoint: "@karsa/booking/routes/admin/schedules.astro" },
      {
        pattern: "/admin/api/bookings/[orderId]",
        entrypoint: "@karsa/booking/routes/api/admin/bookings/[orderId].ts",
      },
    ],
    adminDashboardWidgets: [
      {
        id: "booking-upcoming",
        entrypoint: "@karsa/booking/components/admin/BookingDashboardWidget.astro",
        area: "main",
        order: 25,
      },
    ],
  });
}

export type { BookingRequestAttributes } from "./booking-hooks";
export {
  type Booking,
  type BookingDashboardSummary,
  type BookingScheduleInput,
  type BookingSlot,
  findBookingByOrderId,
  findItemSchedule,
  findOverlappingOrderIds,
  getBookingDashboardSummary,
  type ItemSchedule,
  type ListBookingsOptions,
  listBookings,
  listSlots,
  saveItemSchedule,
} from "./bookings";
export { bookingMessages } from "./messages";
