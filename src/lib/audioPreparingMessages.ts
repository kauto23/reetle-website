/**
 * Copy shown while article TTS is being generated. Detail panel uses full
 * sentences; feed cards use short rotating labels (single line, ~10px type).
 */

export const AUDIO_PREPARING_DETAIL_MESSAGES = [
  'We’re preparing the audio for this article.',
  'Recording the article at a pace suited to your level.',
  'Adjusting the pacing to match your level.',
  'Tuning the audio to the right level for you.',
  'Preparing narration with pacing suited to this article.',
  'Getting the audio ready at a pace appropriate for you.',
  'Tailoring the narration to your language level.',
  'Fine-tuning pronunciation and pacing for your level.',
  'Almost ready. You can keep reading while we finish it.',
  'Adding the final touches to your audio.',
] as const;

/** ~3–5s feels right on a small label without feeling frantic (article panel uses 5s). */
export const AUDIO_PREPARING_INLINE_ROTATE_MS = 4500;

export const AUDIO_PREPARING_INLINE_MESSAGES = [
  'Recording for your level',
  'This won’t take long',
  'Almost ready',
  'Pacing to your level',
  'Hang tight',
  'Fine-tuning audio',
] as const;
