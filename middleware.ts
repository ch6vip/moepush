import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedApis = [
  "/api/channels",
  "/api/endpoint-groups",
  "/api/endpoints",
  "/api/push-group",
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtectedApi = pathname.startsWith("/api/") && protectedApis.some((path) => pathname.startsWith(path))
  const isProtectedPage = pathname.startsWith("/moe")
  const isAuthPage = pathname === "/login" || pathname === "/register"

  let userId: string | undefined
  try {
    const session = await auth()
    // Do not treat a truthy Auth.js error object as an authenticated session.
    userId = session?.user?.id || undefined
  } catch {
    // Protected routes fail closed if authentication configuration is unavailable.
    if (isProtectedApi) return NextResponse.json({ error: "未授权访问" }, { status: 401 })
    if (isProtectedPage) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  if (isProtectedApi && !userId) {
    return NextResponse.json({ error: "未授权访问" }, { status: 401 })
  }

  if (isProtectedPage && !userId) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (userId && isAuthPage) return NextResponse.redirect(new URL("/moe/endpoints", request.url))
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/channels/:path*",
    "/api/endpoint-groups/:path*",
    "/api/endpoints/:path*",
    "/api/push-group/:path*",
    "/moe/:path*",
    "/login",
    "/register",
  ],
}
