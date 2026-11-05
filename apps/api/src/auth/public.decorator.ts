import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_ROUTE = "isPublicRoute";

/**
 * Opts a route (or a whole controller) out of `SessionGuard`. Every route is
 * private by default: adding one without this decorator makes it require a
 * session, so forgetting an auth check fails closed rather than open.
 */
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);
