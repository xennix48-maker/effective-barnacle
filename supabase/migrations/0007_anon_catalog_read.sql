-- 0007_anon_catalog_read.sql
--
-- The machine catalog is public-facing info — shown on the home page even
-- before the visitor is authenticated. Grant anon SELECT on active rows so
-- the landing UI renders for unauthenticated visitors opening the Vercel
-- URL directly in a browser.

DROP POLICY IF EXISTS "machines_catalog_anon_read" ON public.machines_catalog;
CREATE POLICY "machines_catalog_anon_read"
  ON public.machines_catalog
  FOR SELECT
  TO anon
  USING (active = true);

GRANT SELECT ON public.machines_catalog TO anon;