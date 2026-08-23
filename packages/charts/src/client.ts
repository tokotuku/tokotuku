type ChartRuntime = typeof import("./runtime.js");

let runtimePromise: Promise<ChartRuntime> | undefined;
let observer: IntersectionObserver | undefined;
let initialized = false;

function loadRuntime(): Promise<ChartRuntime> {
  runtimePromise ??= import("./runtime.js");
  return runtimePromise;
}

function renderVisible(root: HTMLElement): void {
  loadRuntime().then(({ mountCharts }) => mountCharts(root));
}

function observe(scope: ParentNode): void {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>("[data-chart-root]"));
  if (roots.length === 0) return;

  if (typeof IntersectionObserver === "undefined") {
    for (const root of roots) renderVisible(root);
    return;
  }

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer?.unobserve(entry.target);
        renderVisible(entry.target as HTMLElement);
      }
    },
    { rootMargin: "200px" },
  );

  for (const root of roots) {
    if (root.dataset["chartObserved"] === "true") continue;
    root.dataset["chartObserved"] = "true";
    observer.observe(root);
  }
}

export function mountCharts(scope: ParentNode = document): void {
  observe(scope);

  if (initialized) return;
  initialized = true;
  document.addEventListener("astro:page-load", () => observe(document));
  document.addEventListener("astro:before-swap", () => {
    observer?.disconnect();
    observer = undefined;
    initialized = false;
    runtimePromise?.then(({ disposeCharts }) => disposeCharts());
  });
}

export function disposeCharts(): void {
  observer?.disconnect();
  observer = undefined;
  initialized = false;
  runtimePromise?.then(({ disposeCharts: dispose }) => dispose());
}
