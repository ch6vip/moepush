export const CHANNEL_TYPES = {
  DINGTALK: "dingtalk",
  WECOM: "wecom",
  WECOM_APP: "wecom_app",
  TELEGRAM: "telegram",
  FEISHU: "feishu",
  DISCORD: "discord",
  BARK: "bark",
  WEBHOOK: "webhook",
} as const

export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES]

