export type { ChartAssemblyInput as ChartInput } from "flint-chart/core";

export interface ChartDataRow {
  [field: string]: string | number | boolean | null;
}
