'use server';
/**
 * @fileOverview A flow for searching books using the Google Books API.
 * - searchBooks - Searches for books based on a query.
 * - BookSearchInput - The input type for the searchBooks function.
 * - BookSearchOutput - The return type for the searchBooks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { defineTool } from 'genkit/tool';
import { GEMINI_API_KEY } from '@/lib/config';

const BookSearchInputSchema = z.string().describe('The search query for books (e.g., title, author, ISBN).');
export type BookSearchInput = z.infer<typeof BookSearchInputSchema>;

const BookSchema = z.object({
  title: z.string().describe('The title of the book.'),
  author: z.string().optional().describe('The author of the book.'),
  pageCount: z.number().optional().describe('The number of pages in the book.'),
  image: z.string().optional().describe('A URL to the book cover image.'),
  isForChildren: z.boolean().default(false).describe('Whether the book is for children.'),
});

const BookSearchOutputSchema = z.object({
    success: z.boolean(),
    books: z.array(BookSchema).optional(),
    error: z.string().optional(),
});
export type BookSearchOutput = z.infer<typeof BookSearchOutputSchema>;

const googleBooksApiTool = defineTool(
    {
      name: 'googleBooksApi',
      description: 'Search for books using the Google Books API.',
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.unknown(), // Let the flow handle parsing
    },
    async ({ query }) => {
        const apiKey = GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('Google API key is not configured.');
        }
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}&key=${apiKey}&maxResults=10`;
      
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Google Books API Error:', errorBody);
            throw new Error(`Google Books API request failed with status ${response.status}`);
        }
        return await response.json();
    }
);


export const searchBooksFlow = ai.defineFlow(
    {
        name: 'searchBooksFlow',
        inputSchema: BookSearchInputSchema,
        outputSchema: BookSearchOutputSchema,
    },
    async (query) => {
        try {
            const apiResult = (await googleBooksApiTool({ query })) as any;
            
            if (apiResult.error) {
                 if (apiResult.error.message.includes('API key not valid')) {
                    return { success: false, error: 'API key not valid. Please check your Google API key.' };
                }
                 if (apiResult.error.message.includes('API has not been used')) {
                    return { success: false, error: 'The Google Books API is not enabled for your project. Please enable it in the Google Cloud console.' };
                }
                 if (apiResult.error.message.toLowerCase().includes('blocked')) {
                    return { success: false, error: 'Request was blocked. This may be due to geographical restrictions or other API policies.'};
                }
                return { success: false, error: apiResult.error.message || 'An unknown API error occurred.' };
            }

            if (!apiResult.items || apiResult.items.length === 0) {
                return { success: true, books: [] };
            }

            const books = apiResult.items.map((item: any) => {
                const volumeInfo = item.volumeInfo;
                // Prefer HTTPS for images
                const imageUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail;
                return {
                    title: volumeInfo.title,
                    author: volumeInfo.authors ? volumeInfo.authors.join(', ') : undefined,
                    pageCount: volumeInfo.pageCount,
                    image: imageUrl ? imageUrl.replace(/^http:/, 'https:') : undefined,
                };
            }).filter((book: any) => book.title); // Ensure book has a title

            return { success: true, books };
        } catch (e: any) {
             console.error("Flow Error:", e);
             return { success: false, error: e.message || 'An unexpected error occurred in the flow.' };
        }
    }
);

export async function searchBooks(query: BookSearchInput): Promise<BookSearchOutput> {
  return searchBooksFlow(query);
}
