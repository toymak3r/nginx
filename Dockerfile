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
# Copy admin.html, admin.css, admin.js and favicon to separate location (not in /www bucket)
COPY site/admin.html /usr/share/nginx/html/admin.html
COPY site/admin.css /usr/share/nginx/html/admin.css
COPY site/admin.js /usr/share/nginx/html/admin.js
COPY site/favicon.ico /usr/share/nginx/html/favicon.ico
COPY start.sh /start.sh

# Create /www directory (Railway storage volume will be mounted here)
# IMPORTANT: You must add a volume mount at /www in Railway dashboard
# Go to: Service Settings → Volumes → Add Volume → Mount Path: /www
RUN mkdir -p /www

# Copy initial site files to /www (these will be available if /www is empty)
# Note: If Railway volume is already mounted with files, these won't overwrite
COPY site/* /www/

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Make start script executable
RUN chmod +x /start.sh

# Expose ports
EXPOSE 80

# Start both services
CMD ["/start.sh"]
