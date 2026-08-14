import { defineMiddleware } from "astro:middleware";
import "@tokotuku/auth/register";
import "@tokotuku/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
