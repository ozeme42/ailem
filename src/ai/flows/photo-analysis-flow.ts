'use server';
/**
 * @fileOverview A flow for analyzing photos.
 *
 * - analyzePhoto - A function that handles the photo analysis process.
 * - AnalyzePhotoInput - The input type for the analyzePhoto function.
 * - AnalyzePhotoOutput - The return type for the analyzePhoto function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePhotoInputSchema = z.string().describe(
  "A photo encoded as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
);

export type AnalyzePhotoInput = z.infer<typeof AnalyzePhotoInputSchema>;

const AnalyzePhotoOutputSchema = z.object({
  analysis: z.string().describe('A description of what is in the photo.'),
});

export type AnalyzePhotoOutput = z.infer<typeof AnalyzePhotoOutputSchema>;

export async function analyzePhoto(photoDataUri: AnalyzePhotoInput): Promise<AnalyzePhotoOutput> {
  return photoAnalysisFlow(photoDataUri);
}

const photoAnalysisFlow = ai.defineFlow(
  {
    name: 'photoAnalysisFlow',
    inputSchema: AnalyzePhotoInputSchema,
    outputSchema: AnalyzePhotoOutputSchema,
  },
  async (photoDataUri) => {
    const { text } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: [{ media: { url: photoDataUri } }, {text: 'Bu fotoğrafta ne olduğunu detaylı bir şekilde açıkla.'}],
    });
    return { analysis: text || "Fotoğraf analizi yapılamadı." };
  }
);
