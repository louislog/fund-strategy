# 多阶段：构建 Umi 4 产物 + Nginx 托管（生产部署）
# 本地开发请直接 `npm start`，勿用本镜像跑 dev server。

# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

# 依赖层可缓存：无 lock 时用 install；有 package-lock.json 可改为 npm ci
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# -------- runtime --------
FROM nginx:1.26-alpine AS production

RUN apk add --no-cache curl

RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# dist 内资源已带 /fund/ 前缀引用，整包挂到 html/fund/
COPY --from=builder /app/dist /usr/share/nginx/html/fund

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -sf http://127.0.0.1/healthz > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
