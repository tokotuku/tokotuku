import { Database } from "bun:sqlite";
import {
  collectOrderCreateStatements,
  collectOrderStatusChangeStatements,
  resetOrderHooks,
} from "@karsa/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerInventoryHooks } from "./inventory-hooks";

function sqliteDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE catalog_items (
      id INTEGER PRIMARY KEY,
      fulfillment_type TEXT NOT NULL
    );
    CREATE TABLE inventory_item_stock (
      item_id INTEGER PRIMARY KEY,
      on_hand INTEGER NOT NULL CHECK (on_hand >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE inventory_order_allocations (
      order_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('allocated', 'released')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (order_id, item_id)
    );
    CREATE TABLE inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      order_id INTEGER,
      quantity_change INTEGER NOT NULL,
      reason TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO catalog_items (id, fulfillment_type) VALUES (1, 'physical');
  `);
  const db = {
    prepare(sql: string) {
      const execute = (bindings: unknown[] = []) => {
        const result = sqlite.query(sql).run(...(bindings as never[]));
        return { meta: { changes: result.changes } };
      };
      return {
        run: () => execute(),
        bind: (...bindings: unknown[]) => ({ run: () => execute(bindings) }),
      };
    },
    batch: async (statements: Array<{ run: () => unknown }>) => {
      const transaction = sqlite.transaction(() => {
        for (const statement of statements) statement.run();
      });
      transaction();
      return [];
    },
  };
  return { db, sqlite };
}

describe("confirmation-time inventory allocation", () => {
  beforeEach(() => {
    resetOrderHooks();
    registerInventoryHooks();
  });

  afterEach(() => resetOrderHooks());

  it("does not reserve pending orders, allocates once on confirmation, and restores once on cancel", async () => {
    const { db, sqlite } = sqliteDb();
    try {
      sqlite.query("INSERT INTO inventory_item_stock (item_id, on_hand) VALUES (1, 5)").run();
      expect(
        collectOrderCreateStatements({
          db: db as never,
          orderNumber: "KR-1",
          items: [{ itemId: 1, quantity: 2 }],
        }),
      ).toHaveLength(0);

      const context = {
        db: db as never,
        orderId: 10,
        previousStatus: "pending",
        nextStatus: "confirmed",
        items: [{ itemId: 1, quantity: 2 }],
      };
      await db.batch(collectOrderStatusChangeStatements(context));
      expect(
        sqlite.query("SELECT on_hand FROM inventory_item_stock WHERE item_id = 1").get(),
      ).toEqual({ on_hand: 3 });
      expect(sqlite.query("SELECT state FROM inventory_order_allocations").get()).toMatchObject({
        state: "allocated",
      });

      await db.batch(collectOrderStatusChangeStatements(context));
      expect(
        sqlite.query("SELECT on_hand FROM inventory_item_stock WHERE item_id = 1").get(),
      ).toEqual({ on_hand: 3 });
      expect(sqlite.query("SELECT COUNT(*) AS count FROM inventory_movements").get()).toEqual({
        count: 1,
      });

      await db.batch(
        collectOrderStatusChangeStatements({
          ...context,
          previousStatus: "confirmed",
          nextStatus: "cancelled",
        }),
      );
      expect(
        sqlite.query("SELECT on_hand FROM inventory_item_stock WHERE item_id = 1").get(),
      ).toEqual({ on_hand: 5 });
      expect(sqlite.query("SELECT state FROM inventory_order_allocations").get()).toMatchObject({
        state: "released",
      });
      expect(sqlite.query("SELECT COUNT(*) AS count FROM inventory_movements").get()).toEqual({
        count: 2,
      });
    } finally {
      sqlite.close();
    }
  });

  it("recognizes an existing sale movement without decrementing twice", async () => {
    const { db, sqlite } = sqliteDb();
    try {
      sqlite.query("INSERT INTO inventory_item_stock (item_id, on_hand) VALUES (1, 3)").run();
      sqlite
        .query(
          "INSERT INTO inventory_order_allocations (order_id, item_id, state) VALUES (10, 1, 'allocated')",
        )
        .run();
      sqlite
        .query(
          "INSERT INTO inventory_movements (item_id, order_id, quantity_change, reason) VALUES (1, 10, -2, 'sale')",
        )
        .run();
      await db.batch(
        collectOrderStatusChangeStatements({
          db: db as never,
          orderId: 10,
          previousStatus: "pending",
          nextStatus: "confirmed",
          items: [{ itemId: 1, quantity: 2 }],
        }),
      );
      expect(
        sqlite.query("SELECT on_hand FROM inventory_item_stock WHERE item_id = 1").get(),
      ).toEqual({ on_hand: 3 });
      expect(sqlite.query("SELECT COUNT(*) AS count FROM inventory_movements").get()).toEqual({
        count: 1,
      });
    } finally {
      sqlite.close();
    }
  });

  it("fails closed for a physical item with no stock row", async () => {
    const { db, sqlite } = sqliteDb();
    try {
      await expect(
        db.batch(
          collectOrderStatusChangeStatements({
            db: db as never,
            orderId: 10,
            previousStatus: "pending",
            nextStatus: "confirmed",
            items: [{ itemId: 1, quantity: 1 }],
          }),
        ),
      ).rejects.toThrow();
      expect(
        sqlite.query("SELECT COUNT(*) AS count FROM inventory_order_allocations").get(),
      ).toEqual({
        count: 0,
      });
    } finally {
      sqlite.close();
    }
  });

  it("does not treat scheduled items as inventory", async () => {
    const { db, sqlite } = sqliteDb();
    try {
      sqlite
        .query("INSERT INTO catalog_items (id, fulfillment_type) VALUES (2, 'scheduled')")
        .run();
      await db.batch(
        collectOrderStatusChangeStatements({
          db: db as never,
          orderId: 11,
          previousStatus: "inquiry",
          nextStatus: "confirmed",
          items: [{ itemId: 2, quantity: 1 }],
        }),
      );
      expect(
        sqlite.query("SELECT COUNT(*) AS count FROM inventory_order_allocations").get(),
      ).toEqual({
        count: 0,
      });
    } finally {
      sqlite.close();
    }
  });
});
