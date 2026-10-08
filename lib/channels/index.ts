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

export const CHANNEL_LABELS: Record<ChannelType, string> = Object.entries(channels).reduce(
  (acc, [type, channel]) => ({ ...acc, [type]: channel.getLabel() }),
  {} as Record<ChannelType, string>,
)

export const CHANNEL_TEMPLATES = Object.entries(channels).reduce(
  (acc, [type, channel]) => ({ ...acc, [type]: channel.getTemplates() }),
  {} as Record<ChannelType, any[]>,
)

export function getChannel(type: ChannelType): BaseChannel {
  return channels[type]
}

export async function sendChannelMessage(type: ChannelType, message: any, options: any): Promise<Response> {
  const response = await getChannel(type).sendMessage(message, options)
  // Consume the entire body before the timeout is released by fetchWithTimeout.
  // Callers only need the success result; channel implementations inspect error bodies themselves.
  if (response.body && !response.bodyUsed) await response.arrayBuffer()
  return response
}

export type Channel = DBInferChannel & { type: ChannelType }
