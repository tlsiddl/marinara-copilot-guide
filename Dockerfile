FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY index.js ./
ENV HOME=/home/copilot
RUN mkdir -p /home/copilot/.copilot && chown -R node:node /home/copilot
USER node
CMD ["node","index.js","-m","auto","--session-ttl","0"]
