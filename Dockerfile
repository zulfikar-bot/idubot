FROM node:lts-buster

RUN apt-get update && \
  apt-get install -y \
  neofetch \
  ffmpeg \
  wget \
  yarn \
  webp \
  imagemagick && \
  rm -rf /var/lib/apt/lists/*
  rm -rf /node_modules/Baileys/lib /BotsApp/node_modules/@adiwajshing/baileys/


COPY package.json .

ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN yarn
RUN pwd
RUN ls
COPY . .

EXPOSE 5000
CMD ["npm","run","dev"] #run via nodemon
