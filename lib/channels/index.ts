import { BaseChannel } from "./base"
import type { Channel as DBInferChannel } from "../db/schema/channels"
import { DingTalkChannel } from "./dingtalk"
import { WecomChannel } from "./wecom"
import { WecomAppChannel } from "./wecom-app"
import { TelegramChannel } from "./telegram"
import { FeishuChannel } from "./feishu"
import { DiscordChannel } from "./discord"
import { BarkChannel } from "./bark"
import { WebhookChannel } from "./webhook"
import { CHANNEL_TYPES, type ChannelType } from "./constants"

export { CHANNEL_TYPES }
export type { ChannelType }

// 注册所有渠道
const channels: Record<ChannelType, BaseChannel> = {
  [CHANNEL_TYPES.DINGTALK]: new DingTalkChannel(),
  [CHANNEL_TYPES.WECOM]: new WecomChannel(),
  [CHANNEL_TYPES.WECOM_APP]: new WecomAppChannel(),
  [CHANNEL_TYPES.TELEGRAM]: new TelegramChannel(),
  [CHANNEL_TYPES.FEISHU]: new FeishuChannel(),
  [CHANNEL_TYPES.DISCORD]: new DiscordChannel(),
  [CHANNEL_TYPES.BARK]: new BarkChannel(),
  [CHANNEL_TYPES.WEBHOOK]: new WebhookChannel(),
}

// 获取所有渠道标签
export const CHANNEL_LABELS: Record<ChannelType, string> = Object.entries(channels).reduce(
  (acc, [type, channel]) => ({
    ...acc,
    [type]: channel.getLabel(),
  }),
  {} as Record<ChannelType, string>
)

// 获取所有渠道模板
export const CHANNEL_TEMPLATES = Object.entries(channels).reduce(
  (acc, [type, channel]) => ({
    ...acc,
    [type]: channel.getTemplates(),
  }),
  {} as Record<ChannelType, any[]>
)

// 获取指定渠道
export function getChannel(type: ChannelType): BaseChannel {
  return channels[type]
}

// 发送消息
export async function sendChannelMessage(
  type: ChannelType, 
  message: any, 
  options: any
): Promise<Response> {
  const channel = getChannel(type)
  return channel.sendMessage(message, options)
}

// 导出渠道接口
export type Channel = DBInferChannel & { type: ChannelType }
