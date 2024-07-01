FROM node:16

ENV NODE_ENV=production

WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install all dependencies
RUN npm install

# Prune the dev dependencies to only include production dependencies
RUN npm prune --omit=dev

# Copy the rest of the application code to the container
COPY . .

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD [ "node", "index.js" ]
