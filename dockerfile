# Use Debian Trixie (glibc 2.38+): uWebSockets.js prebuilds require GLIBC_2.38.
# Bookworm has 2.36; Trixie has 2.39. Node 22 for uWebSockets.js ABI (127).
FROM node:22-trixie-slim

# Git + HTTPS for GitHub so npm can fetch uWebSockets.js (lockfile may use git+ssh).
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/* \
	&& git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
	&& git config --global url."https://github.com/".insteadOf "git@github.com:"

WORKDIR /app

# Install all deps (including dev) so we can build
COPY package.json package-lock.json ./
RUN npm ci

# Verify uWebSockets.js native addon loads before running the full build
RUN node -e "require('uWebSockets.js'); console.log('uWebSockets.js OK');"

# Copy source and build during image build
COPY . .
RUN npm run build

# Remove dev dependencies to keep image smaller
RUN npm prune --omit=dev

# Run the built app (adapter outputs build/index.js)
CMD ["node", "build/index.js"]

EXPOSE 3000
