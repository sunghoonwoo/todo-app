ALTER TABLE user_price_reports
ADD COLUMN consultation_type text,
ADD COLUMN overtreatment_pressure text,
ADD COLUMN explanation_detail text,
ADD COLUMN price_fairness text,
ADD COLUMN trust_score integer;
