FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
USER node
WORKDIR /home/node/app
COPY --chown=node:node package*.json ./
RUN npm install --omit=dev
COPY --chown=node:node . .
ENV NODE_ENV=production PORT=7860
CMD ["node", "src/index.js"]
