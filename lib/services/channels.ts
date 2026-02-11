import { Channel, ChannelFormData } from "@/lib/db/schema/channels"
import { request } from "@/lib/services/request"

const API_URL = "/api/channels"

export async function createChannel(data: ChannelFormData) {
  return request<Channel>(
    API_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "创建失败",
  )
}

export async function updateChannel(id: string, data: Partial<ChannelFormData>) {
  return request<Channel>(
    `${API_URL}/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    "更新失败",
  )
}

export async function deleteChannel(id: string) {
  await request(`${API_URL}/${id}`, { method: "DELETE" }, "删除失败")
} 
