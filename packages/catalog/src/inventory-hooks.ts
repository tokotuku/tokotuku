import { onOrderCreate, onOrderStatusChange } from "@karsa/core";

/**
 * Registers the stock-mutation side effects that used to live in D1
 * triggers (order_item_decrease_stock, cancelled_order_restore_stock).
 * Orders itself never mentions stock — this is the only place that does.
 */
export function registerInventoryHooks(): void {
  // Pending checkout no longer reserves stock. Allocation happens at the
  // confirmation boundary below, where an operator has accepted the order.
  onOrderCreate(() => []);

  onOrderStatusChange(({ db, orderId, previousStatus, nextStatus, items }) => {
    if (nextStatus === "confirmed" && previousStatus !== "confirmed") {
      return items.flatMap((item) => [
        db
          .prepare(
            `UPDATE inventory_item_stock
             SET on_hand = on_hand - ?, updated_at = datetime('now')
             WHERE item_id = ?
               AND EXISTS (
                 SELECT 1 FROM catalog_items
                 WHERE id = ? AND fulfillment_type = 'physical'
               )
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_order_allocations
                 WHERE order_id = ? AND item_id = ?
               )`,
          )
          .bind(item.quantity, item.itemId, item.itemId, orderId, item.itemId),
        db
          .prepare(
            `INSERT OR IGNORE INTO inventory_order_allocations (order_id, item_id, state)
             SELECT ?, ?, 'allocated'
             WHERE EXISTS (
                 SELECT 1 FROM inventory_item_stock s
                 JOIN catalog_items c ON c.id = s.item_id
                 WHERE s.item_id = ? AND c.fulfillment_type = 'physical'
               )
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_order_allocations
                 WHERE order_id = ? AND item_id = ?
               )`,
          )
          .bind(orderId, item.itemId, item.itemId, orderId, item.itemId),
        db
          .prepare(
            `INSERT INTO inventory_order_allocations (order_id, item_id, state)
             SELECT ?, ?, 'invalid'
             WHERE EXISTS (
                 SELECT 1 FROM catalog_items
                 WHERE id = ? AND fulfillment_type = 'physical'
               )
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_item_stock
                 WHERE item_id = ?
               )
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_order_allocations
                 WHERE order_id = ? AND item_id = ?
               )`,
          )
          .bind(item.itemId, item.itemId, item.itemId, item.itemId, orderId, item.itemId),
        db
          .prepare(
            `INSERT INTO inventory_movements (item_id, order_id, quantity_change, reason, note)
             SELECT ?, ?, ?, 'sale', 'Stock allocated when order was confirmed'
             WHERE EXISTS (
               SELECT 1 FROM inventory_order_allocations
               WHERE order_id = ? AND item_id = ? AND state = 'allocated'
             )
               AND NOT EXISTS (
                 SELECT 1 FROM inventory_movements
                 WHERE order_id = ? AND item_id = ? AND reason = 'sale'
               )`,
          )
          .bind(item.itemId, orderId, -item.quantity, orderId, item.itemId, orderId, item.itemId),
      ]);
    }

    if (nextStatus !== "cancelled" || previousStatus === "cancelled") return [];
    return items.flatMap((item) => [
      db
        .prepare(
          `UPDATE inventory_item_stock
           SET on_hand = on_hand + ?, updated_at = datetime('now')
           WHERE item_id = ?
             AND EXISTS (
               SELECT 1 FROM inventory_order_allocations
               WHERE order_id = ? AND item_id = ? AND state = 'allocated'
             )`,
        )
        .bind(item.quantity, item.itemId, orderId, item.itemId),
      db
        .prepare(
          `UPDATE inventory_order_allocations
           SET state = 'released', updated_at = datetime('now')
           WHERE order_id = ? AND item_id = ? AND state = 'allocated'`,
        )
        .bind(orderId, item.itemId),
      db
        .prepare(
          `INSERT INTO inventory_movements (item_id, order_id, quantity_change, reason, note)
           SELECT ?, ?, ?, 'cancelled_order', 'Stock restored after order cancellation'
           WHERE EXISTS (
             SELECT 1 FROM inventory_movements
             WHERE order_id = ? AND item_id = ? AND reason = 'sale'
           )
             AND NOT EXISTS (
               SELECT 1 FROM inventory_movements
               WHERE order_id = ? AND item_id = ? AND reason = 'cancelled_order'
             )`,
        )
        .bind(item.itemId, orderId, item.quantity, orderId, item.itemId, orderId, item.itemId),
    ]);
  });
}
