// Raw primitive values only — semantic mapping lives in @tokotuku/theme. `brand` ramp is a placeholder pending real brand colors.
export const neutral = {
  0: "#ffffff",
  50: "#f7f7f8",
  100: "#eeeef0",
  200: "#d8d8dd",
  300: "#b8b8c0",
  400: "#8f8f9a",
  500: "#6f6f7a",
  600: "#56565f",
  700: "#42424a",
  800: "#2b2b30",
  900: "#1a1a1d",
  1000: "#000000",
} as const;

export const brand = {
  50: "#eef6ff",
  100: "#d9ebff",
  200: "#b3d6ff",
  300: "#80baff",
  400: "#4d9aff",
  500: "#1a7bff",
  600: "#0060e6",
  700: "#004bb3",
  800: "#003680",
  900: "#00224d",
} as const;

export const red = {
  100: "#ffe1e1",
  300: "#ff9d9d",
  500: "#e5342e",
  700: "#a3211d",
  900: "#5c1210",
} as const;

export const amber = {
  100: "#fff3d6",
  300: "#ffd166",
  500: "#e5a300",
  700: "#a37400",
  900: "#5c4200",
} as const;

export const green = {
  100: "#dcf7e3",
  300: "#7fe3a0",
  500: "#1fa855",
  700: "#15753b",
  900: "#0c4222",
} as const;

export type NeutralToken = keyof typeof neutral;
export type BrandToken = keyof typeof brand;
export type RedToken = keyof typeof red;
export type AmberToken = keyof typeof amber;
export type GreenToken = keyof typeof green;
