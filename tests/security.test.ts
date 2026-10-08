import assert from "node:assert/strict"
import { test } from "node:test"

import { createEndpointRequestSchema, updateEndpointRequestSchema } from "../lib/db/schema/endpoints"
import { fromBase64Url, isSafeHttpUrl, InvalidJsonBodyError, readJsonBody } from "../lib/security"
import { hashPassword, verifyPassword } from "../lib/utils"

const digestLegacyPassword = async (password: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + (process.env.AUTH_SECRET || "")))
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

test("accepts public HTTP(S) hosts while rejecting local and reserved targets", () => {
  assert.equal(isSafeHttpUrl("https://hooks.example.com/path"), true)
  assert.equal(isSafeHttpUrl("http://192.0.2.1/hook"), false)
  assert.equal(isSafeHttpUrl("http://127.0.0.1/hook"), false)
  assert.equal(isSafeHttpUrl("http://169.254.169.254/latest/meta-data"), false)
  assert.equal(isSafeHttpUrl("http://localhost/hook"), false)
  assert.equal(isSafeHttpUrl("http://service.internal/hook"), false)
  assert.equal(isSafeHttpUrl("https://user:pass@example.com/hook"), false)
  assert.equal(isSafeHttpUrl("file:///etc/passwd"), false)
})

test("endpoint request schemas reject server-managed and unknown fields", () => {
  const valid = { name: " test ", channelId: "channel-1", rule: "{}" }
  assert.equal(createEndpointRequestSchema.parse(valid).name, "test")
  assert.equal(createEndpointRequestSchema.safeParse({ ...valid, userId: "victim" }).success, false)
  assert.equal(updateEndpointRequestSchema.safeParse({ userId: "victim" }).success, false)
  assert.equal(updateEndpointRequestSchema.safeParse({ name: "new", id: "forged" }).success, false)
})

test("rejects malformed request JSON with a typed 400-path error", async () => {
  await assert.rejects(readJsonBody(new Request("https://example.com", { method: "POST", body: "{" })), InvalidJsonBodyError)
})

test("stores independent salted PBKDF2 hashes and verifies them", async () => {
  const hashA = await hashPassword("correct horse battery staple")
  const hashB = await hashPassword("correct horse battery staple")
  assert.notEqual(hashA, hashB)
  assert.match(hashA, /^pbkdf2-sha256\$600000\$/)
  assert.deepEqual(await verifyPassword("correct horse battery staple", hashA), { valid: true, needsRehash: false })
  assert.equal((await verifyPassword("wrong", hashA)).valid, false)
  assert.equal(fromBase64Url(hashA.split("$")[2]).length, 16)
})

test("accepts legacy hashes once so successful login can rehash them", async () => {
  process.env.AUTH_SECRET = "legacy-test-secret"
  const oldHash = await digestLegacyPassword("legacy password")
  assert.deepEqual(await verifyPassword("legacy password", oldHash), { valid: true, needsRehash: true })
  assert.equal((await verifyPassword("wrong", oldHash)).valid, false)
})
