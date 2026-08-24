-- Karsa Journal editorial starting data. Local-only and idempotent.
UPDATE content_posts SET
  title = 'Merawat ritme kerja yang manusiawi',
  excerpt = 'Catatan kecil tentang membuat ruang untuk fokus, jeda, dan percakapan yang jujur.',
  body_markdown = '# Merawat ritme kerja yang manusiawi\n\nKerja yang baik membutuhkan perhatian yang berkelanjutan. Kami mulai dari hal sederhana: satu tujuan yang jelas, jeda yang cukup, dan ruang untuk bertanya.\n\nRitme tidak harus cepat untuk menghasilkan kemajuan. Ia perlu cukup tenang agar keputusan dapat dipikirkan dengan baik.',
  status = 'published',
  published_at = '2026-08-10T08:00:00Z',
  updated_at = datetime('now')
WHERE slug = 'merawat-ritme-kerja';
INSERT INTO content_posts (slug, title, excerpt, body_markdown, status, published_at)
SELECT 'merawat-ritme-kerja', 'Merawat ritme kerja yang manusiawi', 'Catatan kecil tentang membuat ruang untuk fokus, jeda, dan percakapan yang jujur.', '# Merawat ritme kerja yang manusiawi\n\nKerja yang baik membutuhkan perhatian yang berkelanjutan. Kami mulai dari hal sederhana: satu tujuan yang jelas, jeda yang cukup, dan ruang untuk bertanya.\n\nRitme tidak harus cepat untuk menghasilkan kemajuan. Ia perlu cukup tenang agar keputusan dapat dipikirkan dengan baik.', 'published', '2026-08-10T08:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM content_posts WHERE slug = 'merawat-ritme-kerja');

UPDATE content_posts SET
  title = 'Catatan dari meja editor',
  excerpt = 'Sebuah draf tentang cara memilih pertanyaan yang layak dibawa lebih jauh.',
  body_markdown = '# Catatan dari meja editor\n\nTulisan ini masih dalam proses. Kami sedang menguji bagaimana pengalaman sehari-hari dapat menjadi bahan belajar yang berguna.',
  status = 'draft',
  published_at = NULL,
  updated_at = datetime('now')
WHERE slug = 'catatan-dari-meja-editor';
INSERT INTO content_posts (slug, title, excerpt, body_markdown, status, published_at)
SELECT 'catatan-dari-meja-editor', 'Catatan dari meja editor', 'Sebuah draf tentang cara memilih pertanyaan yang layak dibawa lebih jauh.', '# Catatan dari meja editor\n\nTulisan ini masih dalam proses. Kami sedang menguji bagaimana pengalaman sehari-hari dapat menjadi bahan belajar yang berguna.', 'draft', NULL
WHERE NOT EXISTS (SELECT 1 FROM content_posts WHERE slug = 'catatan-dari-meja-editor');

UPDATE content_posts SET
  title = 'Arsip percakapan lama',
  excerpt = 'Percakapan yang pernah membuka jalan untuk melihat pekerjaan dengan sudut pandang baru.',
  body_markdown = '# Arsip percakapan lama\n\nCatatan ini disimpan sebagai bagian dari perjalanan editorial kami.',
  status = 'archived',
  published_at = NULL,
  updated_at = datetime('now')
WHERE slug = 'arsip-percakapan-lama';
INSERT INTO content_posts (slug, title, excerpt, body_markdown, status, published_at)
SELECT 'arsip-percakapan-lama', 'Arsip percakapan lama', 'Percakapan yang pernah membuka jalan untuk melihat pekerjaan dengan sudut pandang baru.', '# Arsip percakapan lama\n\nCatatan ini disimpan sebagai bagian dari perjalanan editorial kami.', 'archived', NULL
WHERE NOT EXISTS (SELECT 1 FROM content_posts WHERE slug = 'arsip-percakapan-lama');
