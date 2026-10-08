import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { authSchema } from "@/lib/validation"
import { eq } from "drizzle-orm"
import { hashPassword } from "@/lib/utils"
import { consumeRegistrationAttempt } from "@/lib/rate-limit"
import { hashRegistrationAddress, InvalidJsonBodyError, readJsonBody } from "@/lib/security"
import { ZodError } from "zod"

export const runtime = "edge"

export async function POST(request: Request) {
  if (process.env.DISABLE_REGISTER === "true") {
    return NextResponse.json({ message: "注册已关闭" }, { status: 403 })
  }

  try {
    const secret = process.env.AUTH_SECRET
    if (!secret || secret.length < 32) {
      return NextResponse.json({ message: "注册服务暂不可用" }, { status: 503 })
    }

    const db = getDb()
    const address = request.headers.get("cf-connecting-ip")?.trim() || "local-development"
    const addressHash = await hashRegistrationAddress(address, secret)
    const nowSeconds = Math.floor(Date.now() / 1000)
    const limit = await consumeRegistrationAttempt(db, addressHash, nowSeconds)
    if (!limit.allowed) {
      return NextResponse.json(
        { message: "请求过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(Math.max(1, limit.resetAt - nowSeconds)) } },
      )
    }

    const json = await readJsonBody(request)
    const { username, password } = authSchema.parse(json)
    const existingUser = await db.query.users.findFirst({ where: eq(users.username, username) })
    if (existingUser) return NextResponse.json({ message: "用户名已存在" }, { status: 400 })

    const hashedPassword = await hashPassword(password)
    await db.insert(users).values({ username, password: hashedPassword, name: username })
    return NextResponse.json({ message: "注册成功" }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "参数错误" }, { status: 400 })
    }
    if (error instanceof InvalidJsonBodyError) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 })
    }
    console.error("[REGISTER_POST]", error)
    return NextResponse.json({ message: "注册失败" }, { status: 500 })
  }
}
