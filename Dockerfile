FROM node:20-alpine
WORKDIR /app
COPY package.json server.js tm-simulator.html ./
EXPOSE 3000
CMD ["node", "server.js"]
