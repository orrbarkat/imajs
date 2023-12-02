# Use the official Node.js 14 image as a parent image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Add user for running the application
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser \
    && mkdir -p /home/appuser && chown -R appuser:appuser /home/appuser

# Use the user for running subsequent commands
USER appuser

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your app's source code from your host to your image filesystem
COPY . .

# Inform Docker that the container is listening on the specified port at runtime.
EXPOSE 8000

# Run the specified command within the container.
CMD [ "node", "src/index.js" ]