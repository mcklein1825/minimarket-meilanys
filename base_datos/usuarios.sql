-- Archivo: usuarios.sql
-- Proyecto: Minimarket Meilanys
-- Compatibilidad: PostgreSQL / Supabase

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO usuarios (nombre, username, email, password)
VALUES
  ('Administrador', 'admin', 'admin@lacanasta.com', 'admin123'),
  ('María López', 'maria', 'maria@lacanasta.com', 'maria2025'),
  ('Jorge Ramírez', 'jorge', 'jorge@lacanasta.com', 'jorge2025'),
  ('Ana Torres', 'ana', 'ana@lacanasta.com', 'ana2025'),
  ('Diego Silva', 'diego', 'diego@lacanasta.com', 'diego2025')
ON CONFLICT (username) DO UPDATE
SET nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    password = EXCLUDED.password;

-- Credenciales de prueba:
-- admin / admin123
-- maria / maria2025
-- jorge / jorge2025
-- ana / ana2025
-- diego / diego2025

-- En Supabase puedes ejecutarlo desde SQL Editor o desde el cliente psql.
