import { defineMiddleware } from "astro:middleware";
import "@takontuku/auth/register";
import "@takontuku/booking/register";
import "@takontuku/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
