# Build stage
FROM node:20-alpine as builder
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN yarn build

# Run stage
FROM caddy:2.7.3-alpine
LABEL org.opencontainers.image.source="https://github.com/gardencmp/succulent"

# Copy the built files from builder stage to Caddy's serve directory
COPY --from=builder /app/dist /usr/share/caddy/