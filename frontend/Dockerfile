FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* are inlined into the bundle at build time
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
ARG NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS=
ARG NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS=$NEXT_PUBLIC_MONINGO_CONTRACT_ADDRESS \
    NEXT_PUBLIC_MONAD_RPC_URL=$NEXT_PUBLIC_MONAD_RPC_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build && mkdir -p public

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
USER node
EXPOSE 3000
CMD ["npm", "start"]
