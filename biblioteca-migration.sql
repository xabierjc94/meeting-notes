-- Tabla para la sección Biblioteca
CREATE TABLE IF NOT EXISTS biblioteca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Sin título',
  content jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own biblioteca"
  ON biblioteca FOR ALL
  USING (auth.uid() = owner_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_biblioteca_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER biblioteca_updated_at
  BEFORE UPDATE ON biblioteca
  FOR EACH ROW EXECUTE FUNCTION update_biblioteca_updated_at();
