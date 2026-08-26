import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";
import "@karsa/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
