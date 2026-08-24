import { defineMiddleware } from "astro:middleware";
import "@karsa/auth/register";
import "@karsa/booking/register";
import "@karsa/catalog/register";

export const onRequest = defineMiddleware((_context, next) => next());
