export type AppKind = "compro" | "product" | "service";
export type Tier = "install" | "content" | "polished";

export interface FixtureSpec {
  name: string;
  kind: AppKind;
  tier: Tier;
  brand: string;
  expectedModules: string[];
  minimumAssets: number;
  minimumProducts: number;
  minimumServices: number;
}

export const FIXTURES: FixtureSpec[] = [
  {
    name: "compro-install",
    kind: "compro",
    tier: "install",
    brand: "Arunika Energi",
    expectedModules: ["auth"],
    minimumAssets: 0,
    minimumProducts: 0,
    minimumServices: 0,
  },
  {
    name: "compro-content",
    kind: "compro",
    tier: "content",
    brand: "Arunika Energi",
    expectedModules: ["auth"],
    minimumAssets: 0,
    minimumProducts: 0,
    minimumServices: 0,
  },
  {
    name: "compro-polished",
    kind: "compro",
    tier: "polished",
    brand: "Arunika Energi",
    expectedModules: ["auth"],
    minimumAssets: 3,
    minimumProducts: 0,
    minimumServices: 0,
  },
  {
    name: "product-install",
    kind: "product",
    tier: "install",
    brand: "Racik Rasa",
    expectedModules: ["auth", "catalog", "orders"],
    minimumAssets: 0,
    minimumProducts: 0,
    minimumServices: 0,
  },
  {
    name: "product-content",
    kind: "product",
    tier: "content",
    brand: "Racik Rasa",
    expectedModules: ["auth", "catalog", "orders"],
    minimumAssets: 0,
    minimumProducts: 6,
    minimumServices: 0,
  },
  {
    name: "product-polished",
    kind: "product",
    tier: "polished",
    brand: "Racik Rasa",
    expectedModules: ["auth", "catalog", "orders"],
    minimumAssets: 5,
    minimumProducts: 6,
    minimumServices: 0,
  },
  {
    name: "service-install",
    kind: "service",
    tier: "install",
    brand: "Teman Ekor",
    expectedModules: ["auth", "catalog", "orders", "booking"],
    minimumAssets: 0,
    minimumProducts: 0,
    minimumServices: 0,
  },
  {
    name: "service-content",
    kind: "service",
    tier: "content",
    brand: "Teman Ekor",
    expectedModules: ["auth", "catalog", "orders", "booking"],
    minimumAssets: 0,
    minimumProducts: 0,
    minimumServices: 3,
  },
  {
    name: "service-polished",
    kind: "service",
    tier: "polished",
    brand: "Teman Ekor",
    expectedModules: ["auth", "catalog", "orders", "booking"],
    minimumAssets: 4,
    minimumProducts: 0,
    minimumServices: 3,
  },
];

export function fixtureSpec(name: string): FixtureSpec {
  const spec = FIXTURES.find((item) => item.name === name);
  if (!spec) throw new Error(`Unknown fixture: ${name}`);
  return spec;
}
