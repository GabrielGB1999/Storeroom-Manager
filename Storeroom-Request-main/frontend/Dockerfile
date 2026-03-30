FROM python:3.9-slim

WORKDIR /app

# Copy all frontend files (html, css, js) into the container
COPY . .

# Run a simple HTTP server on port 6767
CMD ["python", "-m", "http.server", "6767"]
