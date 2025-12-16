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
COPY nginx.conf /etc/nginx/nginx.conf.template
# Copy admin.html to separate location (not in /www bucket)
COPY site/admin.html /usr/share/nginx/html/admin.html
COPY start.sh /start.sh

# Create /www directory (bucket will be mounted here by Railway)
RUN mkdir -p /www

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Make start script executable
RUN chmod +x /start.sh

# Expose ports
EXPOSE 80

# Start both services
CMD ["/start.sh"]
