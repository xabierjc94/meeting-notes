-- =====================================================
-- GESTIÓN DE PERSONAL - Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- Positions (user-scoped)
CREATE TABLE IF NOT EXISTS positions (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name      text NOT NULL,
  position  integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own positions"
  ON positions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Clinics (user-scoped, shared across all projects)
CREATE TABLE IF NOT EXISTS clinics (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name      text NOT NULL,
  position  integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clinics"
  ON clinics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Candidacy statuses (user-scoped)
CREATE TABLE IF NOT EXISTS candidacy_statuses (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name      text NOT NULL,
  color     text DEFAULT '#6366f1',
  position  integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidacy_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own candidacy statuses"
  ON candidacy_statuses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Personnel records (linked to each project)
CREATE TABLE IF NOT EXISTS personnel (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id              uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  nombre_apellidos        text NOT NULL,
  posicion                text DEFAULT '',
  regiones                text[] DEFAULT '{}',
  clinicas                text[] DEFAULT '{}',
  situacion               text DEFAULT '',
  experiencia             text DEFAULT '',
  expectativas_salariales text DEFAULT '',
  fecha_incorporacion     date,
  preaviso                text DEFAULT '',
  otros                   text DEFAULT '',
  estado_candidatura      text DEFAULT '',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own personnel"
  ON personnel FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_personnel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personnel_updated_at
  BEFORE UPDATE ON personnel
  FOR EACH ROW
  EXECUTE FUNCTION update_personnel_updated_at();
