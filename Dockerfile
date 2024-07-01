FROM node:16

ENV NODE_ENV=production

WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY ["package.json", "package-lock.json*", "./"]

# Install the production dependencies using npm ci
RUN npm ci --omit=dev

# Copy the rest of the application code to the container
COPY . .

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD [ "node", "index.js" ]
