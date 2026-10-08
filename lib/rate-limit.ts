import { sql } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import * as schema from "./db/schema"
import { registrationRateLimits } from "./db/schema/registration-rate-limits"

type Db = DrizzleD1Database<typeof schema>

export const REGISTRATION_WINDOW_SECONDS = 15 * 60
export const REGISTRATION_MAX_REQUESTS = 5

export async function consumeRegistrationAttempt(
  db: Db,
  addressHash: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const windowStartedAt = Math.floor(nowSeconds / REGISTRATION_WINDOW_SECONDS) * REGISTRATION_WINDOW_SECONDS
  const [row] = await db
    .insert(registrationRateLimits)
    .values({ addressHash, windowStartedAt, requestCount: 1 })
    .onConflictDoUpdate({
      target: registrationRateLimits.addressHash,
      set: {
        windowStartedAt,
        requestCount: sql`CASE WHEN ${registrationRateLimits.windowStartedAt} = ${windowStartedAt} THEN ${registrationRateLimits.requestCount} + 1 ELSE 1 END`,
      },
    })
    .returning({ requestCount: registrationRateLimits.requestCount })

  return {
    allowed: row.requestCount <= REGISTRATION_MAX_REQUESTS,
    remaining: Math.max(0, REGISTRATION_MAX_REQUESTS - row.requestCount),
    resetAt: windowStartedAt + REGISTRATION_WINDOW_SECONDS,
  }
}
