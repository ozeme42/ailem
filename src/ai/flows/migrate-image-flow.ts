
'use server';
/**
 * @fileOverview A flow for migrating an image from a URL or uploading a Data URI to Firebase Storage.
 * - migrateImage - Downloads an image or decodes a data URI and uploads it to Firebase Storage.
 * - MigrateImageInput - The input type for the migrateImage function.
 * - MigrateImageOutput - The return type for the migrateImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';
import fetch from 'node-fetch';
import 'dotenv/config';

// Initialize Firebase Admin SDK at the start of the flow execution context
const admin = getFirebaseAdmin();

const MigrateImageInputSchema = z.object({
  sourceUrl: z.string().url('A valid URL of the image to migrate.').optional(),
  imageDataUri: z.string().optional(),
  destinationPath: z.string().describe('The destination path in Firebase Storage (e.g., "book-covers/image.jpg").'),
}).refine(data => data.sourceUrl || data.imageDataUri, {
    message: 'Either sourceUrl or imageDataUri must be provided.',
}).refine(data => {
    if (data.imageDataUri) {
        return data.imageDataUri.startsWith('data:image');
    }
    return true;
}, {
    message: 'imageDataUri must be a valid image data URI.',
    path: ['imageDataUri'],
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
  async ({ sourceUrl, imageDataUri, destinationPath }) => {
    try {
      let imageBuffer: Buffer;
      let contentType: string;

      if (sourceUrl) {
          const response = await fetch(sourceUrl);
          if (!response.ok) {
            throw new Error(`Failed to download image from ${sourceUrl}. Status: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
          contentType = response.headers.get('content-type') || 'image/jpeg';
      } else if (imageDataUri) {
          const parts = imageDataUri.split(',');
          const mimeTypePart = parts[0].match(/:(.*?);/);
          if (!mimeTypePart || !parts[1]) {
            throw new Error('Invalid Data URI format.');
          }
          contentType = mimeTypePart[1];
          imageBuffer = Buffer.from(parts[1], 'base64');
      } else {
        throw new Error('No image source provided.');
      }

      const bucket = admin.storage().bucket();
      const file = bucket.file(destinationPath);
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: contentType,
        },
      });
      
      await file.makePublic();
      const publicUrl = file.publicUrl();

      return { success: true, newUrl: publicUrl };

    } catch (e: any) {
      console.error("Image migration failed:", e);
      if (e.code === 'storage/unauthorized' || (e.message && (e.message.includes('permission-denied') || e.message.includes('permission denied')))) {
         return { success: false, error: 'Görsel yükleme yetkisi alınamadı. Lütfen Firebase IAM ayarlarınızı kontrol edin (örn: Storage Admin rolü).' };
      }
      if (e.code === 'EAI_AGAIN' || (e.message && e.message.includes('EAI_AGAIN'))) {
         return { success: false, error: 'DNS çözümleme hatası. İnternet bağlantınızı ve storage.googleapis.com adresine erişiminizi kontrol edin.'};
      }
      if (e.message && (e.message.includes('Could not refresh access token') || e.code === 'auth/internal-error' || e.message.includes('Credential implementation provided no access token'))) {
         return { success: false, error: 'Firebase kimlik doğrulaması başarısız. Projenizin Cloud Storage API\'sinin etkin ve faturalandırmanın aktif olduğundan emin olun.' };
      }
      return { success: false, error: e.message || 'Görsel taşınırken beklenmedik bir sunucu hatası oluştu.' };
    }
  }
);

export async function migrateImage(input: MigrateImageInput): Promise<MigrateImageOutput> {
  return migrateImageFlow(input);
}
