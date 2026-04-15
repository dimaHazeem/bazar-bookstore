FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY app.js ./
EXPOSE 5001
CMD ["node", "app.js"]