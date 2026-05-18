-- Añadir columna file_name a la tabla biblioteca
ALTER TABLE biblioteca ADD COLUMN IF NOT EXISTS file_name text;
