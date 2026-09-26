FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
ENV NODE_ENV=production PORT=5000 DATABASE_URL=file:/app/data/moningo.db
RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD node -e "fetch('http://localhost:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
