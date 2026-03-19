FROM node:24-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package management files
COPY package.json ./

# Install prod dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy the rest of the application code including dist folder
COPY . .

# Port is expected to be provided by Cloud Run
ENV PORT=8080
EXPOSE 8080

# Run in production mode
ENV NODE_ENV=production

# Start the Express server
CMD ["node", "server.js"]
