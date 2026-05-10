INSERT INTO treatment_types (name, category)
VALUES ('정기검진', 'general')
ON CONFLICT (name) DO NOTHING;
