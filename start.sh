#!/bin/sh

# Use Railway's PORT for nginx (Railway assigns this automatically)
NGINX_PORT=${PORT:-80}
BACKEND_PORT=3000

# Export for envsubst
export NGINX_PORT
export BACKEND_PORT

# Generate nginx config with dynamic port
envsubst '${NGINX_PORT} ${BACKEND_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Node.js backend in background with fixed port
BACKEND_PORT=$BACKEND_PORT node server.js &

# Wait a moment for backend to start
sleep 2

# Start nginx in foreground
nginx -g 'daemon off;'

