-- Fix RLS: Ensure anon role can INSERT/UPDATE/DELETE on user_price_reports
-- Recreate update_report_with_pin with all current columns

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_price_reports' AND policyname = 'anon_insert') THEN
    CREATE POLICY "anon_insert" ON user_price_reports FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_price_reports' AND policyname = 'anon_update') THEN
    CREATE POLICY "anon_update" ON user_price_reports FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_price_reports' AND policyname = 'anon_delete') THEN
    CREATE POLICY "anon_delete" ON user_price_reports FOR DELETE USING (true);
  END IF;
END
$$;

DROP FUNCTION IF EXISTS update_report_with_pin;

CREATE OR REPLACE FUNCTION update_report_with_pin(
  p_report_id UUID,
  p_treatment_ids INTEGER[],
  p_price INTEGER,
  p_visit_date DATE,
  p_review_text TEXT,
  p_friendliness_score INTEGER,
  p_nickname TEXT,
  p_consultation_type TEXT,
  p_overtreatment_pressure TEXT,
  p_explanation_detail TEXT,
  p_price_fairness TEXT,
  p_trust_score INTEGER,
  p_image_url TEXT
)
RETURNS TABLE(success BOOLEAN, visit_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_visit_id UUID;
  v_clinic_id UUID;
  v_pin TEXT;
BEGIN
  SELECT r.visit_id, r.clinic_id, r.pin
    INTO v_visit_id, v_clinic_id, v_pin
    FROM user_price_reports r
   WHERE r.report_id = p_report_id;

  IF v_visit_id IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID;
    RETURN;
  END IF;

  UPDATE user_price_reports
     SET treatment_id = p_treatment_ids[1],
         price = p_price,
         visit_date = p_visit_date,
         review_text = p_review_text,
         friendliness_score = p_friendliness_score,
         nickname = p_nickname,
         consultation_type = p_consultation_type,
         overtreatment_pressure = p_overtreatment_pressure,
         explanation_detail = p_explanation_detail,
         price_fairness = p_price_fairness,
         trust_score = p_trust_score,
         image_url = p_image_url
   WHERE report_id = p_report_id;

  DELETE FROM user_price_reports
   WHERE visit_id = v_visit_id
     AND clinic_id = v_clinic_id
     AND report_id <> p_report_id
     AND treatment_id <> ALL(p_treatment_ids);

  INSERT INTO user_price_reports (
    clinic_id, treatment_id, visit_id, pin, price, visit_date,
    review_text, friendliness_score, nickname,
    consultation_type, overtreatment_pressure, explanation_detail,
    price_fairness, trust_score, image_url
  )
  SELECT v_clinic_id, unnest, v_visit_id, v_pin, p_price, p_visit_date,
         p_review_text, p_friendliness_score, p_nickname,
         p_consultation_type, p_overtreatment_pressure, p_explanation_detail,
         p_price_fairness, p_trust_score, p_image_url
  FROM unnest(p_treatment_ids) AS unnest
  WHERE unnest <> ALL(
    SELECT treatment_id FROM user_price_reports
    WHERE visit_id = v_visit_id AND clinic_id = v_clinic_id
  );

  RETURN QUERY SELECT true::BOOLEAN, v_visit_id;
END;
$$;
