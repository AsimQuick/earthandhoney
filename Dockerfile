# ---
# file: Dockerfile
# stack: nextjs
# purpose: Production-ready Next.js container
# created-by: project-lead
# ---

FROM node:20-alpine

RUN apk add --no-cache bash

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
