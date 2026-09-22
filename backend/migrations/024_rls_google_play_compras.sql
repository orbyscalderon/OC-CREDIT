-- Se me pasó activar RLS en esta tabla al crearla (migración 022) --
-- todas las demás tablas del schema ya lo tienen activado (sin políticas
-- propias, el backend conecta con un rol que bypassea RLS igual). Sin
-- esto, Supabase Advisor lo marca CRITICAL: si algún día se expone la API
-- automática de PostgREST, esta tabla quedaría legible/escribible por
-- cualquiera con la key pública.
ALTER TABLE google_play_compras ENABLE ROW LEVEL SECURITY;
