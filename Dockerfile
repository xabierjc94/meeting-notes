# ---------- build ----------
# Vite 8 requiere Node ^20.19 o >=22.12.
FROM node:22-alpine AS build
WORKDIR /app

# Vite "hornea" las variables VITE_* dentro del JS en tiempo de build,
# asi que tienen que llegar aqui como build args (en Coolify: variables
# marcadas como disponibles en build), no solo en runtime.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm ci

COPY . .

# Sin estas variables el build "funciona" pero la app sale rota en el navegador.
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
  || (echo "ERROR: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY como build args" && exit 1)

RUN npm run build

# ---------- serve ----------
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Sin esto Coolify solo sabe "el proceso existe", no "el proceso sirve".
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
