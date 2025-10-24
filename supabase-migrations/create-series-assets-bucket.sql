-- Create storage bucket for series visual assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'series-assets',
  'series-assets',
  true, -- Public bucket for image optimization
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for series-assets bucket

-- Allow public read access to all files (required for Next.js Image optimization)
CREATE POLICY "Public read access for series assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'series-assets');

-- Allow authenticated users to upload files to their own user folder
CREATE POLICY "Users can upload their own series assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'series-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can view their own series assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'series-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own series assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'series-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'series-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own series assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'series-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
