import { env } from "cloudflare:workers";
import { registerSessionResolver, registerSetupGate } from "@karsa/core";
import { createAuth } from "./auth";
import { canAccessBackoffice } from "./roles";
import { isSetupComplete } from "./setup";

registerSessionResolver(async (request) => {
  const auth = createAuth(env, new URL(request.url).origin);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { user: null, canAccessBackoffice: false };
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role ?? null,
    },
    canAccessBackoffice: canAccessBackoffice(session.user.role),
  };
});

registerSetupGate(() => isSetupComplete(env.DB));
