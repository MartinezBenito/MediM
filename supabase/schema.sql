-- Script de inicialización para la base de datos de LuxHealth

-- 1. Tabla: pacientes
CREATE TABLE IF NOT EXISTS public.pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_uid UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT,
    apellido TEXT,
    email TEXT,
    fecha_nacimiento DATE,
    telefono TEXT,
    puntos INTEGER DEFAULT 0,
    nivel INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla: citas
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_id UUID,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT,
    especialidad TEXT,
    estado TEXT DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla: indicadores_salud
CREATE TABLE IF NOT EXISTS public.indicadores_salud (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    presion TEXT,
    glucosa NUMERIC,
    peso NUMERIC,
    temperatura NUMERIC,
    notas TEXT,
    alertas JSONB,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla: logros
CREATE TABLE IF NOT EXISTS public.logros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    icono TEXT,
    fecha_obtenido TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla: retos
CREATE TABLE IF NOT EXISTS public.retos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    progreso INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (Seguridad de Datos)
-- ==========================================

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_salud ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retos ENABLE ROW LEVEL SECURITY;

-- Políticas: un paciente solo puede ver y editar su propia información
CREATE POLICY "pacientes_policy" ON public.pacientes FOR ALL USING (auth.uid() = auth_uid);
CREATE POLICY "citas_policy" ON public.citas FOR ALL USING (auth.uid() = paciente_id);
CREATE POLICY "indicadores_policy" ON public.indicadores_salud FOR ALL USING (auth.uid() = paciente_id);
CREATE POLICY "logros_policy" ON public.logros FOR ALL USING (auth.uid() = paciente_id);
CREATE POLICY "retos_policy" ON public.retos FOR ALL USING (auth.uid() = paciente_id);
