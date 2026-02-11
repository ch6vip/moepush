import { Endpoint, NewEndpoint } from "@/lib/db/schema/endpoints"
import { generateExampleBody } from "../generator"
import { request } from "@/lib/services/request"

const API_URL = "/api/endpoints"

export async function createEndpoint(data: NewEndpoint) {
  return request<Endpoint>(
    API_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "创建失败",
  )
}

export async function updateEndpoint(id: string, data: Partial<NewEndpoint>) {
  return request<Endpoint>(
    `${API_URL}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "更新失败",
  )
}

export async function deleteEndpoint(id: string) {
  await request(`${API_URL}/${id}`, { method: "DELETE" }, "删除失败")
}

export async function toggleEndpointStatus(id: string) {
  return request<Endpoint>(`${API_URL}/${id}/toggle`, { method: "POST" }, "切换状态失败")
}

export async function testEndpoint(id: string, rule: string) {
  const exampleBody = generateExampleBody(rule)
  return request(
    `/api/push/${id}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exampleBody),
    },
    "测试失败",
  )
}

export async function getEndpoints() {
  return request(API_URL, undefined, "获取接口失败")
}   
