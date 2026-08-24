import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";

export const onRequest = defineMiddleware((_context, next) => next());
