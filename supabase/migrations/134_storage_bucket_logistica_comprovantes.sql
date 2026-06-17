-- Migration 134: cria bucket privado para comprovantes de entrega da logística.
-- Referenciado por FreteDetalhePage.tsx (BUCKET_NAME = 'logistica-comprovantes').
-- Bucket privado — acesso via signed URLs geradas no frontend (1 ano de TTL).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logistica-comprovantes',
  'logistica-comprovantes',
  FALSE,
  10485760,  -- 10 MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Política: usuários autenticados podem fazer upload na pasta do frete deles.
CREATE POLICY "logistica_comp_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'logistica-comprovantes');

-- Política: usuários autenticados podem ler objetos do bucket.
CREATE POLICY "logistica_comp_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'logistica-comprovantes');

-- Política: usuários autenticados podem deletar (para re-upload).
CREATE POLICY "logistica_comp_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'logistica-comprovantes');
