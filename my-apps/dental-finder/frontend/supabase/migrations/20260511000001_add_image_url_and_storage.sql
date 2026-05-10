-- Add image_url column to user_price_reports
ALTER TABLE user_price_reports ADD COLUMN image_url text;

-- Create storage bucket for review images
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

-- Allow authenticated uploads (service_role)
CREATE POLICY "Authenticated Write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-images');
