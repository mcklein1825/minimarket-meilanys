FROM php:8.2-cli

# Instalar las librerías del sistema necesarias y la extensión pdo_pgsql para Supabase
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo_pgsql

WORKDIR /app
COPY . /app

EXPOSE 10000

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} -t ."]
