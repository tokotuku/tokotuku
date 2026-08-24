/// <reference path="./virtual.d.ts" />
import brandConfig from "virtual:karsa/config";
import { createFormatters } from "./format";

export const brand = brandConfig;
export const { money, date } = createFormatters(brandConfig);
