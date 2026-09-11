FROM node:24-slim

RUN apt-get update && apt-get install -y libatomic1 openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
