# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# TODO: migrate GROQ calls to backend proxy
# Build-time env var for Vite (must use ARG + ENV so Vite can read it)
ARG VITE_GROQ_API_KEY
ENV VITE_GROQ_API_KEY=$VITE_GROQ_API_KEY

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
