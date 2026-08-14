import { BarChart, HeatmapChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import {
  AriaComponent,
  DatasetComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import type { ECharts, EChartsCoreOption } from "echarts/core";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { assembleECharts } from "flint-chart/echarts";
import type { ChartInput } from "./types.js";

echarts.use([
  AriaComponent,
  BarChart,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  HeatmapChart,
  LegendComponent,
  LineChart,
  PieChart,
  ScatterChart,
  SVGRenderer,
  TooltipComponent,
  VisualMapComponent,
]);

interface ChartConfig {
  input: ChartInput;
  title: string;
  description?: string;
}

type FlintEChartsOption = EChartsCoreOption & {
  _height?: number;
  _warnings?: { message: string }[];
  _width?: number;
};

interface MountedChart {
  chart: ECharts;
  resizeObserver: ResizeObserver;
  themeObserver: MutationObserver;
}

const mountedCharts = new Map<HTMLElement, MountedChart>();

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function theme(): object {
  const foreground = token("--tk-color-fg");
  const muted = token("--tk-color-fg-muted");
  const border = token("--tk-color-border");

  return {
    color: [
      token("--tk-color-accent"),
      token("--tk-color-success"),
      token("--tk-color-warning"),
      token("--tk-color-danger"),
      muted,
    ],
    textStyle: { color: foreground },
    legend: { textStyle: { color: muted } },
    categoryAxis: {
      axisLabel: { color: muted },
      axisLine: { lineStyle: { color: border } },
      splitLine: { lineStyle: { color: border } },
    },
    valueAxis: {
      axisLabel: { color: muted },
      axisLine: { lineStyle: { color: border } },
      splitLine: { lineStyle: { color: border } },
    },
  };
}

function parseConfig(root: HTMLElement): ChartConfig | undefined {
  const source = root.querySelector<HTMLScriptElement>("script[data-chart-config]");
  if (!source?.textContent) return undefined;

  try {
    return JSON.parse(source.textContent) as ChartConfig;
  } catch {
    root.dataset.chartState = "error";
    return undefined;
  }
}

function compile(config: ChartConfig): EChartsCoreOption {
  const compiled = assembleECharts(config.input) as FlintEChartsOption;
  const { _height, _warnings, _width, ...option } = compiled;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    ...option,
    animation: !reducedMotion,
    aria: {
      enabled: true,
      description: config.description ?? config.title,
      decal: { show: true },
    },
    backgroundColor: "transparent",
  } as EChartsCoreOption;
}

function render(root: HTMLElement, config: ChartConfig): MountedChart | undefined {
  const canvas = root.querySelector<HTMLElement>("[data-chart-canvas]");
  if (!canvas) return undefined;

  const existing = echarts.getInstanceByDom(canvas);
  existing?.dispose();

  try {
    const chart = echarts.init(canvas, theme(), { renderer: "svg" });
    chart.setOption(compile(config), { notMerge: true });
    root.dataset.chartState = "ready";

    chart.on("click", (detail) => {
      root.dispatchEvent(new CustomEvent("chart-select", { bubbles: true, detail }));
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(root);

    const themeObserver = new MutationObserver(() => {
      const current = mountedCharts.get(root);
      current?.resizeObserver.disconnect();
      current?.themeObserver.disconnect();
      current?.chart.dispose();
      mountedCharts.delete(root);

      const replacement = render(root, config);
      if (replacement) mountedCharts.set(root, replacement);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return { chart, resizeObserver, themeObserver };
  } catch (error) {
    root.dataset.chartState = "error";
    const message = root.querySelector<HTMLElement>("[data-chart-error]");
    if (message) {
      message.textContent = error instanceof Error ? error.message : "Unable to render chart.";
    }
    return undefined;
  }
}

export function mountCharts(scope: ParentNode = document): void {
  for (const root of scope.querySelectorAll<HTMLElement>("[data-chart-root]")) {
    if (mountedCharts.has(root)) continue;
    const config = parseConfig(root);
    if (!config) continue;
    const mounted = render(root, config);
    if (mounted) mountedCharts.set(root, mounted);
  }
}

export function disposeCharts(): void {
  for (const mounted of mountedCharts.values()) {
    mounted.resizeObserver.disconnect();
    mounted.themeObserver.disconnect();
    mounted.chart.dispose();
  }
  mountedCharts.clear();
}
