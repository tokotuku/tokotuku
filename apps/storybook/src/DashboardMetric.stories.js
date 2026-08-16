import DashboardMetric from "@takontuku/ui/DashboardMetric.astro";

export default { title: "Admin/DashboardMetric", component: DashboardMetric };
export const Default = {
  args: { label: "Active products", value: "6", hint: "Across 6 categories" },
};
export const LowStock = {
  args: { label: "Low stock", value: "2", hint: "≤ 5 units", tone: "warning" },
};
