FROM node:18-alpine

# Install nginx
RUN apk add --no-cache nginx

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./
RUN npm install

# Copy application files
COPY server.js ./
COPY nginx.conf /etc/nginx/nginx.conf
COPY site /usr/share/nginx/html
COPY start.sh /start.sh

# Make start script executable
RUN chmod +x /start.sh

# Expose ports
EXPOSE 80

# Start both services
CMD ["/start.sh"]
