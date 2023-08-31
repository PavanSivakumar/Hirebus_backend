FROM node:15.13.0-alpine
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN ls -la
RUN npm install --silent
ENV NODE_ENV=prod
EXPOSE 3000 80
CMD npm start
