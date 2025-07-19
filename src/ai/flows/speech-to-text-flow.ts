'use server';
/**
 * @fileOverview A flow for transcribing audio to text.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.string().describe(
  "An audio file encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
);

export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  text: z.string().describe('The transcribed text from the audio.'),
});

export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(audioDataUri: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  return speechToTextFlow(audioDataUri);
}

const speechToTextFlow = ai.defineFlow(
  {
    name: 'speechToTextFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (audioDataUri) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: [{ media: { url: audioDataUri } }, {text: 'Transcribe this audio.'}],
    });
    return { text: text || "Metin anlaşılamadı." };
  }
);
