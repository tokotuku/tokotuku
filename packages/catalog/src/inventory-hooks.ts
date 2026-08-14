import { onOrderCreate, onOrderStatusChange } from "@tokotuku/core";

/**
 * Registers the stock-mutation side effects that used to live in D1
 * triggers (order_item_decrease_stock, cancelled_order_restore_stock).
 * Orders itself never mentions stock — this is the only place that does.
 */
export function registerInventoryHooks(): void {
  onOrderCreate(({ db, orderNumber, items }) =>
    items.flatMap((item) => [
      db
        .prepare(
          "UPDATE inventory_item_stock SET on_hand = on_hand - ?, updated_at = datetime('now') WHERE item_id = ?",
        )
        .bind(item.quantity, item.itemId),
      db
        .prepare(
          `INSERT INTO inventory_movements (item_id, order_id, quantity_change, reason, note)
           VALUES (?, (SELECT id FROM orders WHERE order_number = ?), ?, 'sale', 'Stock reserved for order')`,
        )
        .bind(item.itemId, orderNumber, -item.quantity),
    ]),
  );

  onOrderStatusChange(({ db, orderId, previousStatus, nextStatus, items }) => {
    if (nextStatus !== "cancelled" || previousStatus === "cancelled") return [];
    return items.flatMap((item) => [
      db
        .prepare(
          "UPDATE inventory_item_stock SET on_hand = on_hand + ?, updated_at = datetime('now') WHERE item_id = ?",
        )
        .bind(item.quantity, item.itemId),
      db
        .prepare(
          `INSERT INTO inventory_movements (item_id, order_id, quantity_change, reason, note)
           VALUES (?, ?, ?, 'cancelled_order', 'Stock restored after order cancellation')`,
        )
        .bind(item.itemId, orderId, item.quantity),
    ]);
  });
}
