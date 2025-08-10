# Etapa 1: Construcción de la aplicación Node.js
FROM cgr.dev/chainguard/node:latest AS build

# ENV NODE_ENV=production
ENV NODE_ENV=development


# Copiar los archivos del proyecto
COPY --chown=node:node ["./", "/app/"]

WORKDIR /app

# Instalar las dependencias de producción
RUN npm install

USER root
RUN npm install -g @angular/cli
USER node

# Construir la aplicación Angular
RUN npm run build

# RUN npx ng build

# Etapa 2: Configuración de Nginx
FROM cgr.dev/chainguard/nginx:latest

COPY --from=build /app/dist/demo-open-layers/browser /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

