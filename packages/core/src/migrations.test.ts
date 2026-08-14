import { describe, expect, it } from "vitest";
import { emptyLockfile, planMigrationSync } from "./migrations";
import type { ModuleMigration } from "./module";

function migration(name: string): ModuleMigration {
  return { name, url: new URL(`https://example.test/${name}.sql`) };
}

describe("planMigrationSync", () => {
  it("assigns sequential numbers to every module on a fresh install, in topo order", () => {
    const modules = [
      { name: "auth", migrations: [migration("init")] },
      { name: "catalog", migrations: [migration("init")] },
      { name: "orders", migrations: [migration("init")] },
    ];

    const { plan, lockfile } = planMigrationSync(modules, emptyLockfile());

    expect(plan.map((item) => item.fileName)).toEqual([
      "0000_auth_init.sql",
      "0001_catalog_init.sql",
      "0002_orders_init.sql",
    ]);
    expect(lockfile).toEqual({ nextSequence: 3, modules: { auth: 1, catalog: 1, orders: 1 } });
  });

  it("is idempotent — running again against its own output produces an empty plan", () => {
    const modules = [
      { name: "auth", migrations: [migration("init")] },
      { name: "catalog", migrations: [migration("init")] },
    ];
    const first = planMigrationSync(modules, emptyLockfile());

    const second = planMigrationSync(modules, first.lockfile);

    expect(second.plan).toEqual([]);
    expect(second.lockfile).toEqual(first.lockfile);
  });

  it("gives a module added later the next global number, without touching already-applied files", () => {
    const initial = [
      { name: "auth", migrations: [migration("init")] },
      { name: "catalog", migrations: [migration("init")] },
      { name: "orders", migrations: [migration("init")] },
    ];
    const { lockfile: appliedLockfile } = planMigrationSync(initial, emptyLockfile());

    // `booking` requires `catalog` and topo-sorts between catalog and orders,
    // but it was only added to the client's config after the above was
    // already applied to a real database.
    const withBooking = [
      { name: "auth", migrations: [migration("init")] },
      { name: "catalog", migrations: [migration("init")] },
      { name: "booking", migrations: [migration("init")] },
      { name: "orders", migrations: [migration("init")] },
    ];
    const { plan, lockfile } = planMigrationSync(withBooking, appliedLockfile);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.fileName).toBe("0003_booking_init.sql");
    expect(lockfile.nextSequence).toBe(4);
    // auth/catalog/orders keep the counts (and by extension, the filenames)
    // they were already assigned — nothing about them changes.
    expect(lockfile.modules).toEqual({ auth: 1, catalog: 1, orders: 1, booking: 1 });
  });

  it("only syncs the new migrations when an already-installed module gains more", () => {
    const v1 = [{ name: "catalog", migrations: [migration("init")] }];
    const { lockfile: appliedLockfile } = planMigrationSync(v1, emptyLockfile());

    const v2 = [
      { name: "catalog", migrations: [migration("init"), migration("add-fulfillment-type")] },
    ];
    const { plan, lockfile } = planMigrationSync(v2, appliedLockfile);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.fileName).toBe("0001_catalog_add-fulfillment-type.sql");
    expect(lockfile.modules["catalog"]).toBe(2);
  });

  it("never assigns a number lower than one already used, however modules are reordered", () => {
    const first = [
      { name: "catalog", migrations: [migration("init")] },
      { name: "orders", migrations: [migration("init")] },
    ];
    const { lockfile: appliedLockfile } = planMigrationSync(first, emptyLockfile());

    // A module that topo-sorts before both, added after both are applied.
    const withEarlyModule = [
      { name: "auth", migrations: [migration("init")] },
      { name: "catalog", migrations: [migration("init")] },
      { name: "orders", migrations: [migration("init")] },
    ];
    const { plan } = planMigrationSync(withEarlyModule, appliedLockfile);

    expect(plan).toHaveLength(1);
    expect(plan[0]?.fileName).toBe("0002_auth_init.sql");
  });

  it("produces no plan and an unchanged lockfile for a module with no migrations", () => {
    const { plan, lockfile } = planMigrationSync([{ name: "ui", migrations: [] }], emptyLockfile());
    expect(plan).toEqual([]);
    expect(lockfile).toEqual({ nextSequence: 0, modules: {} });
  });
});
