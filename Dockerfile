FROM node:20-alpine

WORKDIR /app

# Copia metadados e arquivos de aplicação
COPY package*.json ./
COPY . .

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
