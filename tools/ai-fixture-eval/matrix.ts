export type AppKind = "company" | "product" | "service" | "publication";
export type Tier = "install" | "content" | "polished";
export type Registration = "closed" | "public";

export interface FixtureSpec {
  name: string;
  kind: AppKind;
  tier: Tier;
  brand: string;
  expectedModules: string[];
  registration: Registration;
  catalogPresentation?: "products" | "services";
  ordersPresentation?: "orders" | "inquiries";
  minimumAssets: number;
  minimumProducts: number;
  minimumServices: number;
  minimumPosts: number;
}

const company = (tier: Tier): FixtureSpec => ({
  name: `company-${tier}`,
  kind: "company",
  tier,
  brand: "Arunika Energi",
  expectedModules: ["auth"],
  registration: "closed",
  minimumAssets: tier === "polished" ? 3 : 0,
  minimumProducts: 0,
  minimumServices: 0,
  minimumPosts: 0,
});

const product = (tier: Tier): FixtureSpec => ({
  name: `product-${tier}`,
  kind: "product",
  tier,
  brand: "Racik Rasa",
  expectedModules: ["auth", "catalog", "orders"],
  registration: "public",
  catalogPresentation: "products",
  ordersPresentation: "orders",
  minimumAssets: tier === "polished" ? 5 : 0,
  minimumProducts: tier === "install" ? 0 : 6,
  minimumServices: 0,
  minimumPosts: 0,
});

const service = (tier: Tier): FixtureSpec => ({
  name: `service-${tier}`,
  kind: "service",
  tier,
  brand: "Teman Ekor",
  expectedModules: ["auth", "catalog", "orders", "booking"],
  registration: "public",
  catalogPresentation: "services",
  ordersPresentation: "inquiries",
  minimumAssets: tier === "polished" ? 4 : 0,
  minimumProducts: 0,
  minimumServices: tier === "install" ? 0 : 3,
  minimumPosts: 0,
});

const publication = (tier: Tier): FixtureSpec => ({
  name: `publication-${tier}`,
  kind: "publication",
  tier,
  brand: "Karsa Journal",
  expectedModules: ["auth", "content"],
  registration: "closed",
  minimumAssets: tier === "polished" ? 1 : 0,
  minimumProducts: 0,
  minimumServices: 0,
  minimumPosts: tier === "install" ? 0 : 3,
});

export const FIXTURES: FixtureSpec[] = [
  company("install"),
  company("content"),
  company("polished"),
  product("install"),
  product("content"),
  product("polished"),
  service("install"),
  service("content"),
  service("polished"),
  publication("install"),
  publication("content"),
  publication("polished"),
];

export function fixtureSpec(name: string): FixtureSpec {
  const spec = FIXTURES.find((item) => item.name === name);
  if (!spec) throw new Error(`Unknown fixture: ${name}`);
  return spec;
}
