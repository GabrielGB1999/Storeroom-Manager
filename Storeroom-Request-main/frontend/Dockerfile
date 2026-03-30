FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Copy all frontend files (html, css, js) into the container
COPY . .

# Copy the custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 6767
EXPOSE 6767

CMD ["nginx", "-g", "daemon off;"]
