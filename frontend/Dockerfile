FROM node:18-alpine AS build
WORKDIR /app

# copy manifest files first for better caching (build context is ./frontend)
COPY package.json tsconfig.json vite.config.ts ./
# Use `npm install` during image build to support projects without lockfile.
RUN npm install --no-audit --no-fund

COPY . /app
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
