export interface FormattersConfig {
  locale: string;
  currency: string;
  timeZone?: string;
}

export interface Formatters {
  money(amountInMajorUnits: number): string;
  date(value: Date | string): string;
}

export function createFormatters(config: FormattersConfig): Formatters {
  const moneyFormat = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
  });
  const dateFormat = new Intl.DateTimeFormat(config.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: config.timeZone,
  });

  return {
    money: (amount) => moneyFormat.format(amount),
    date: (value) => dateFormat.format(typeof value === "string" ? new Date(value) : value),
  };
}
