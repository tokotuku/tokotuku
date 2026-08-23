import { defineMiddleware } from "astro:middleware";
import "@takontuku/auth/register";

export const onRequest = defineMiddleware((_context, next) => next());
