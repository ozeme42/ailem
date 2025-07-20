'use server';
/**
 * @fileOverview A flow for searching books using the Open Library API.
 * - searchBooks - Searches for books based on a query.
 * - BookSearchInput - The input type for the searchBooks function.
 * - BookSearchOutput - The return type for the searchBooks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

const openLibraryApiTool = ai.defineTool(
    {
      name: 'openLibraryApi',
      description: 'Search for books using the Open Library API.',
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.unknown(), // Let the flow handle parsing
    },
    async ({ query }) => {
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=title,author_name,number_of_pages_median,cover_i,subject`;
      
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Open Library API Error:', errorBody);
            throw new Error(`Open Library API request failed with status ${response.status}`);
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
            const apiResult = (await openLibraryApiTool({ query })) as any;
            
            if (apiResult.error) {
                return { success: false, error: apiResult.error.message || 'An unknown API error occurred.' };
            }

            if (!apiResult.docs || apiResult.docs.length === 0) {
                return { success: true, books: [] };
            }

            const books = apiResult.docs.map((item: any) => {
                const imageUrl = item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : undefined;
                const isForChildren = (item.subject || []).some((s: string) => 
                    s.toLowerCase().includes('juvenile') || 
                    s.toLowerCase().includes('children')
                );

                return {
                    title: item.title,
                    author: item.author_name ? item.author_name.join(', ') : undefined,
                    pageCount: item.number_of_pages_median,
                    image: imageUrl,
                    isForChildren: isForChildren,
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
