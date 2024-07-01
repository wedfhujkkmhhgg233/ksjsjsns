FROM node:16

ENV NODE_ENV=production

WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY ["package.json", "package-lock.json*", "./"]

# Install all dependencies and update the package-lock.json if necessary
RUN npm install

# Install only production dependencies and omit the dev dependencies
RUN npm prune --omit=dev

# Copy the rest of the application code to the container
COPY . .

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD [ "node", "index.js" ]
