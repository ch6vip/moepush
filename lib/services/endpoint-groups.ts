import { EndpointGroupWithEndpoints } from "@/types/endpoint-group"
import { generateExampleBody } from "@/lib/utils"
import { request } from "@/lib/services/request"

const API_URL = '/api/endpoint-groups'

interface EndpointGroupResponse {
  id: string
  name: string
  userId: string
  status: "active" | "inactive"
  createdAt: string
  updatedAt: string
  endpointIds: string[]
  endpoints: any[]
}

interface ToggleEndpointGroupResponse extends EndpointGroupResponse {
  status: "active" | "inactive"
}

export async function getEndpointGroups(): Promise<EndpointGroupWithEndpoints[]> {
  const data = await request<EndpointGroupResponse[]>(API_URL, undefined, "获取接口组失败")
  return data.map(group => ({
    ...group,
    createdAt: new Date(group.createdAt),
    updatedAt: new Date(group.updatedAt)
  }))
}

export interface CreateEndpointGroupData {
  name: string
  endpointIds: string[]
}

export async function createEndpointGroup(data: CreateEndpointGroupData): Promise<{ id: string }> {
  if (!data.endpointIds.length) {
    throw new Error('请至少选择一个接口')
  }

  return request<{ id: string }>(
    API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
      }),
    },
    "创建接口组失败",
  )
}

export interface UpdateEndpointGroupData {
  name: string
  endpointIds: string[]
}

export async function updateEndpointGroup(id: string, data: UpdateEndpointGroupData): Promise<{ success: boolean }> {
  if (!data.endpointIds.length) {
    throw new Error('请至少选择一个接口')
  }

  return request<{ success: boolean }>(
    `${API_URL}/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
    "更新接口组失败",
  )
}

export async function deleteEndpointGroup(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${API_URL}/${id}`, { method: "DELETE" }, "删除接口组失败")
}

export async function toggleEndpointGroupStatus(id: string): Promise<EndpointGroupWithEndpoints> {
  const data = await request<ToggleEndpointGroupResponse>(`${API_URL}/${id}/toggle`, { method: "POST" }, "切换状态失败")
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    endpointIds: data.endpointIds,
    endpoints: data.endpoints
  }
}

export async function testEndpointGroup(group: EndpointGroupWithEndpoints): Promise<any> {
  // 使用所有接口中的规则生成测试数据
  const allRules = group.endpoints.flatMap(e => e.rule ? [e.rule] : [])
  const exampleBody = generateExampleBody(allRules.length > 0 ? allRules.join('\n') : '{}')

  return request(
    `/api/push-group/${group.id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(exampleBody),
    },
    "测试推送失败",
  )
} 
