FROM node:24.21.0-bookworm-slim

LABEL org.opencontainers.image.title="MoePush"
LABEL org.opencontainers.image.description="MoePush notification service"
LABEL org.opencontainers.image.source="https://github.com/ch6vip/moepush"
LABEL org.opencontainers.image.licenses="MIT"

ENV TZ=Asia/Taipei
WORKDIR /app

RUN npm install --global pnpm@9.15.9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN cp wrangler.example.json wrangler.json \
  && node -e 'const fs=require("fs");const p="wrangler.json";const c=JSON.parse(fs.readFileSync(p,"utf8"));c.d1_databases[0].database_name="moepush";c.d1_databases[0].database_id="00000000-0000-0000-0000-000000000001";fs.writeFileSync(p,JSON.stringify(c,null,2))' \
  && pnpm pages:build

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

ENV AUTH_TRUST_HOST=true
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/.wrangler"]

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
