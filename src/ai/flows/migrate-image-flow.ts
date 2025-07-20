'use server';
/**
 * @fileOverview A flow for migrating an image from a URL to Firebase Storage.
 * - migrateImage - Downloads an image and uploads it to Firebase Storage.
 * - MigrateImageInput - The input type for the migrateImage function.
 * - MigrateImageOutput - The return type for the migrateImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import admin from '@/lib/firebaseAdmin';

const MigrateImageInputSchema = z.object({
  sourceUrl: z.string().url('A valid URL of the image to migrate.'),
  destinationPath: z.string().describe('The destination path in Firebase Storage (e.g., "book-covers/image.jpg").'),
});
export type MigrateImageInput = z.infer<typeof MigrateImageInputSchema>;

const MigrateImageOutputSchema = z.object({
  success: z.boolean(),
  newUrl: z.string().optional().describe('The public URL of the newly uploaded image.'),
  error: z.string().optional(),
});
export type MigrateImageOutput = z.infer<typeof MigrateImageOutputSchema>;

export const migrateImageFlow = ai.defineFlow(
  {
    name: 'migrateImageFlow',
    inputSchema: MigrateImageInputSchema,
    outputSchema: MigrateImageOutputSchema,
  },
  async ({ sourceUrl, destinationPath }) => {
    try {
      // 1. Download the image from the source URL using axios
      const response = await axios.get(sourceUrl, { responseType: 'arraybuffer' });
      if (response.status !== 200) {
        throw new Error(`Failed to download image from ${sourceUrl}. Status: ${response.statusText}`);
      }
      const imageBuffer = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'image/jpeg';

      // 2. Upload the image to Firebase Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(destinationPath);
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: contentType,
        },
      });
      
      // Make the file public and get the URL
      await file.makePublic();
      const publicUrl = file.publicUrl();

      return { success: true, newUrl: publicUrl };

    } catch (e: any) {
      console.error("Image migration failed:", e);
      return { success: false, error: e.message || 'An unexpected error occurred during image migration.' };
    }
  }
);

export async function migrateImage(input: MigrateImageInput): Promise<MigrateImageOutput> {
  return migrateImageFlow(input);
}
