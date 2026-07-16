export interface DemoOrder {
  id: string;
  customer: string;
  email: string;
  initials: string;
  color: string;
  date: string;
  items: number;
  total: number;
  status: "Pending" | "Shipped" | "Completed" | "Refunded" | "Processing" | "Cancelled";
}

export const demoOrders: DemoOrder[] = [
  {
    id: "10428",
    customer: "Acme Corp",
    email: "billing@acme.co",
    initials: "AC",
    color: "#34495e",
    date: "Jun 18, 2026",
    items: 6,
    total: 1490,
    status: "Pending",
  },
  {
    id: "10427",
    customer: "Riverway Ltd",
    email: "ap@riverway.io",
    initials: "RL",
    color: "#c47b63",
    date: "Jun 17, 2026",
    items: 2,
    total: 580,
    status: "Shipped",
  },
  {
    id: "10426",
    customer: "Northwind Traders",
    email: "orders@northwind.com",
    initials: "NT",
    color: "#2f6f76",
    date: "Jun 17, 2026",
    items: 18,
    total: 8200,
    status: "Completed",
  },
  {
    id: "10425",
    customer: "Globex",
    email: "buy@globex.com",
    initials: "GX",
    color: "#80558c",
    date: "Jun 16, 2026",
    items: 1,
    total: 240,
    status: "Refunded",
  },
  {
    id: "10424",
    customer: "Initech",
    email: "po@initech.com",
    initials: "IN",
    color: "#598a79",
    date: "Jun 15, 2026",
    items: 4,
    total: 1120,
    status: "Completed",
  },
  {
    id: "10423",
    customer: "Soylent Co",
    email: "ops@soylent.co",
    initials: "SC",
    color: "#82725e",
    date: "Jun 15, 2026",
    items: 9,
    total: 3015,
    status: "Processing",
  },
  {
    id: "10422",
    customer: "Hooli",
    email: "finance@hooli.xyz",
    initials: "HO",
    color: "#3c83a4",
    date: "Jun 14, 2026",
    items: 3,
    total: 675,
    status: "Shipped",
  },
  {
    id: "10421",
    customer: "Vehement Capital",
    email: "desk@vehement.com",
    initials: "VC",
    color: "#5c6e4c",
    date: "Jun 13, 2026",
    items: 1,
    total: 95,
    status: "Cancelled",
  },
  {
    id: "10420",
    customer: "Stark Industries",
    email: "ap@stark.com",
    initials: "SI",
    color: "#687b34",
    date: "Jun 12, 2026",
    items: 12,
    total: 4300,
    status: "Completed",
  },
  {
    id: "10419",
    customer: "Wayne Enterprises",
    email: "buy@wayne.co",
    initials: "WE",
    color: "#1d3447",
    date: "Jun 11, 2026",
    items: 7,
    total: 2150,
    status: "Pending",
  },
];

export const statusTone = (status: DemoOrder["status"]) =>
  (
    ({
      Pending: "warning",
      Shipped: "info",
      Completed: "success",
      Refunded: "danger",
      Processing: "info",
      Cancelled: "neutral",
    }) as const
  )[status];

export const topCustomers = [
  { name: "Acme Corp", orders: 18, total: 24910, change: 12, color: "#70a7ef" },
  { name: "Riverway Ltd", orders: 11, total: 18200, change: 6, color: "#31a1ca" },
  { name: "Northwind Traders", orders: 9, total: 12540, change: -3, color: "#eda93c" },
  { name: "Globex", orders: 7, total: 9180, change: 8, color: "#ef6970" },
  { name: "Initech", orders: 5, total: 6420, change: -2, color: "#55b975" },
  { name: "Hooli", orders: 4, total: 5180, change: 5, color: "#71a7ec" },
];

export const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
