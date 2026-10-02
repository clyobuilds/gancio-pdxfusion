FROM oven/bun:slim

RUN apt-get update && apt-get install -y \
    bash \
    curl \
    git \
    tor \
    privoxy \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node

COPY . .


RUN bun install
ENV NODE_ENV=development

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]

