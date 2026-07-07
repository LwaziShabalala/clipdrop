FROM node:20-alpine

# Install ffmpeg and ffprobe
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all source files
COPY . .

# Generate the Prisma client — needs prisma/schema.prisma and
# prisma.config.ts, which is why this runs here, after COPY . ., not
# right after npm ci.
RUN npx prisma generate

# Declare build-time args (Railway injects these from your Variables tab)
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_SITE_URL

# Promote to ENV so `next build` can actually read them
ENV NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=$NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ENV NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Apply any pending database migrations, then start the app. Runs at
# container startup (not build time), so DATABASE_URL is available from
# Railway's runtime variables by then.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]