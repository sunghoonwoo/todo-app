CREATE OR REPLACE FUNCTION search_clinics_by_bounds(
  sw_lat double precision,
  sw_lng double precision,
  ne_lat double precision,
  ne_lng double precision,
  search_term text DEFAULT '',
  report_ids text[] DEFAULT NULL
)
RETURNS TABLE(
  clinic_id text,
  name text,
  address text,
  city text,
  district text,
  phone text,
  lat double precision,
  lng double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT c.clinic_id, c.name, c.address, c.city, c.district, c.phone, c.lat, c.lng
  FROM clinics c
  WHERE c.is_active = true
    AND c.location_geom && ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
    AND (search_term = '' OR c.name ILIKE '%' || search_term || '%')
    AND (report_ids IS NULL OR c.clinic_id = ANY(report_ids))
  ORDER BY c.name;
$$;
