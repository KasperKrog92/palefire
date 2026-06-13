-- Palefire moved to recorded-only audio: drop the procedurally generated
-- built-in ambience loops (source 'builtin:%') and any preset layers that
-- referenced them. Delete layers first so this does not rely on the
-- foreign_keys pragma being enabled on the connection.
DELETE FROM preset_layers
WHERE audio_file_id IN (SELECT id FROM audio_files WHERE source LIKE 'builtin:%');

DELETE FROM audio_files WHERE source LIKE 'builtin:%';
