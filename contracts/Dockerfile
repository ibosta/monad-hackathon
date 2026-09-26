# One-shot deployer: compiles, tests and deploys Moningo to Monad Testnet.
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx hardhat compile
CMD ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "monadTestnet"]
