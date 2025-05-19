# Base image
FROM node:18

# Create app directory
WORKDIR /app

# Copy only package files and install dependencies
COPY package*.json ./
RUN npm install

# Run build script
RUN npm run build

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
