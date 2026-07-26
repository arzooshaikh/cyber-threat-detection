FROM node:22-slim

WORKDIR /app

# Install deps first (separate layer) so `docker compose build` doesn't
# re-run `npm install` every time only source files change.
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ /app/

EXPOSE 5173

# --host 0.0.0.0 is required so the dev server is reachable from outside
# the container (from your Windows browser), not just from inside it.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
