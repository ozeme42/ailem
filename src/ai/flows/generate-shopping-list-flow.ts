'use server';
/**
 * @fileOverview A flow for generating structured shopping list items from natural language text.
 * - generateShoppingListItems - Parses text to create shopping items.
 * - GenerateShoppingListInput - The input type for the flow.
 * - GenerateShoppingListOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateShoppingListInputSchema = z
  .string()
  .describe('A natural language string containing items for a shopping list. e.g., "2 kilo domates, 1 paket süt ve ekmek"');
export type GenerateShoppingListInput = z.infer<typeof GenerateShoppingListInputSchema>;

const ShoppingItemSchema = z.object({
  name: z.string().describe('The name of the shopping item.'),
  quantity: z.string().optional().describe('The quantity or amount of the item.'),
  category: z.string().describe("The category of the shopping item (e.g., 'Meyve ve Sebze', 'Süt Ürünleri', 'Temizlik', 'Diğer')."),
});

const GenerateShoppingListOutputSchema = z.object({
  items: z.array(ShoppingItemSchema).describe('An array of structured shopping items.'),
});
export type GenerateShoppingListOutput = z.infer<typeof GenerateShoppingListOutputSchema>;

const generatePrompt = ai.definePrompt({
  name: 'generateShoppingListPrompt',
  input: { schema: GenerateShoppingListInputSchema },
  output: { schema: GenerateShoppingListOutputSchema },
  prompt: `You are an expert at parsing shopping lists from natural language.
    Analyze the user's request and extract each item into a structured format.
    For each item, identify the name, quantity if available, and a relevant category.
    
    Possible categories include, but are not limited to:
    - Meyve ve Sebze
    - Süt Ürünleri
    - Et ve Tavuk Ürünleri
    - Unlu Mamüller
    - Temel Gıda
    - Atıştırmalık
    - İçecekler
    - Dondurulmuş Gıdalar
    - Temizlik Ürünleri
    - Kişisel Bakım
    - Bebek Ürünleri
    - Diğer

    User request: {{{prompt}}}
    `,
});

export const generateShoppingListItemsFlow = ai.defineFlow(
  {
    name: 'generateShoppingListItemsFlow',
    inputSchema: GenerateShoppingListInputSchema,
    outputSchema: GenerateShoppingListOutputSchema,
  },
  async (prompt) => {
    const { output } = await generatePrompt(prompt);
    return output!;
  }
);

export async function generateShoppingListItems(query: GenerateShoppingListInput): Promise<GenerateShoppingListOutput> {
  return generateShoppingListItemsFlow(query);
}
