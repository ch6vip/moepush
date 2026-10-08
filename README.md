<p align="center">
  <img src="public/moe_logo.png" alt="MoePush Logo" width="100" height="100">
  <h1 align="center">MoePush</h1>
</p>

<p align="center">
  一个基于 NextJS + Cloudflare 技术栈构建的可爱消息推送服务, 支持多种消息推送渠道✨
</p>

## 在线演示

[https://moepush.app](https://moepush.app)

![home](https://pic.otaku.ren/20250221/AQAD5b8xG9vVwFV-.jpg)

![login](https://pic.otaku.ren/20250221/AQAD678xG9vVwFV-.jpg)

![dashboard](https://pic.otaku.ren/20250221/AQAD7b8xG9vVwFV-.jpg)

## 特性

- 📡**多渠道支持** ：支持钉钉、企业微信、Telegram 等多种消息推送渠道。
- 🛠️**简单易用** ：提供简单的接口调用，支持多种消息模板，快速集成。
- 💖**开源免费** ：基础功能完全免费使用，代码开源，欢迎贡献。
- 🎨**精美 UI** ：使用 shadcn/ui 组件库，提供精美 UI 设计。
- 🚀**快速部署** ：基于 [Cloudflare Pages](https://pages.cloudflare.com/) 部署，免费且稳定。
- 📦**接口组功能** ：支持创建接口组，一次性推送消息到多个渠道接口。

## 已支持渠道

- 钉钉群机器人
- 企业微信应用
- 企业微信群机器人
- Telegram 机器人
- 飞书群机器人
- Discord Webhook
- Bark App
- 通用 Webhook

## 技术栈
- **框架**: [Next.js](https://nextjs.org/) (App Router)
- **平台**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **数据库**: [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
- **认证**: [NextAuth](https://authjs.dev/getting-started/installation?framework=Next.js) 配合 GitHub 登录
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件**: 基于 [Radix UI](https://www.radix-ui.com/) 的自定义组件
- **类型安全**: [TypeScript](https://www.typescriptlang.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)

## 本地运行

1. 克隆项目并安装依赖：

```bash
git clone https://github.com/beilunyang/moepush.git
cd moepush
pnpm install
```

2. 复制环境变量文件：

```bash
cp .env.example .env
```

环境变量文件 `.env` 中需要配置以下变量：

- `AUTH_SECRET`：加密 Session 的密钥
- `AUTH_GITHUB_ID`：GitHub OAuth App ID
- `AUTH_GITHUB_SECRET`：GitHub OAuth App Secret
- `DISABLE_REGISTER`：是否禁止注册，默认为`false`，设置为 `true` 则禁止注册

3. 创建 wrangler.json 文件
```bash
cp wrangler.example.json wrangler.json
```

4. 初始化本地数据库
```bash
pnpm run db:migrate-local
```

5. 运行开发服务器：

```bash
pnpm run dev
```

访问 http://localhost:3000 查看应用。

## 部署

### 视频版保姆级部署教程
https://www.bilibili.com/video/BV1dtZBYnEUX/?p=2

### GitHub Actions 自动部署

项目配置了 GitHub Actions：推送到 `main` 会验证并部署；手动触发也只有选择 `main` 分支才会进入生产部署 job。请在 GitHub 仓库中创建 `production` Environment，限制可部署分支为 `main`，并按团队策略设置 reviewer 审批。

### 部署前需要在 GitHub 仓库设置中添加以下 Secrets：
- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Account ID
- `D1_DATABASE_NAME`：D1 数据库名称
- `AUTH_SECRET`：加密 Session 的密钥
- `AUTH_GITHUB_ID`：GitHub OAuth App ID
- `AUTH_GITHUB_SECRET`：GitHub OAuth App Secret
- `PROJECT_NAME`：项目名称 (可选，默认：moepush)
- `DISABLE_REGISTER`：是否禁止注册，默认关闭，设置为 `true` 则禁止注册

### 使用 Docker 本地运行 Cloudflare Pages/D1

该镜像通过 Wrangler Pages runtime 提供 Cloudflare 请求上下文，并使用本地 D1 数据库；它不是普通 `next start` 容器，也不会自动连接远程 D1。生产环境仍建议使用 Cloudflare Pages 工作流。

```bash
docker build -t moepush .
docker run --rm -p 3000:3000 \
  -v "$(pwd)/.wrangler:/app/.wrangler" \
  -e AUTH_SECRET=<你的AUTH_SECRET> \
  -e AUTH_GITHUB_ID=<你的AUTH_GITHUB_ID> \
  -e AUTH_GITHUB_SECRET=<你的AUTH_GITHUB_SECRET> \
  -e DISABLE_REGISTER=false \
  moepush
```

## 贡献

欢迎提交 Pull Request 或者 Issue来帮助改进这个项目

## 交流
<table>
  <tr style="max-width: 360px">
    <td>
      <img src="https://pic.otaku.ren/20250309/AQADAcQxGxQjaVZ-.jpg" />
    </td>
    <td>
      <img src="https://pic.otaku.ren/20250309/AQADCMQxGxQjaVZ-.jpg" />
    </td>
  </tr>
  <tr style="max-width: 360px">
    <td>
      关注公众号，了解更多项目进展以及AI，区块链，独立开发资讯
    </td>
    <td>
      添加微信，备注 "MoePush" 拉你进微信交流群
    </td>
  </tr>
</table>

## 支持

如果你喜欢这个项目，欢迎给它一个 Star ⭐️
或者进行赞助
<br />
<br />
<img src="https://pic.otaku.ren/20240212/AQADPrgxGwoIWFZ-.jpg" style="width: 400px;"/>
<br />
<br />
<a href="https://www.buymeacoffee.com/beilunyang" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="width: 400px;" ></a>

## 许可证

[MIT](LICENSE)
