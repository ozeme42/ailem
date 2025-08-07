
'use server';
/**
 * @fileOverview The AI Education Coach provides personalized learning assistance.
 * - runCoach - The main function to interact with the coach for text-based queries.
 * - analyzeQuestionImage - A dedicated function to handle image-based questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { onQuestionBanksUpdate } from '@/lib/dataService';
import type { QuestionBank, CoachMessage } from '@/lib/data';

// Tool to get available subjects and topics for text-based chat
const getAvailableTopicsTool = ai.defineTool(
  {
    name: 'getAvailableTopics',
    description: 'Kullanıcı bir konu anlatımı istediğinde, sistemde kayıtlı olan dersleri ve konuları listelemek için bu aracı kullan. Bu, öğrencinin öğrenme bağlamını anlamana yardımcı olur.',
    outputSchema: z.array(z.string()),
  },
  async () => {
    try {
      const banks: QuestionBank[] = await new Promise((resolve) => {
        onQuestionBanksUpdate(resolve, true);
      });
      const topicsList = banks.flatMap(bank => 
        bank.subjects.flatMap(subject => 
          subject.topics.map(topic => `${subject.name} - ${topic.name}`)
        )
      );
      return Array.from(new Set(topicsList));
    } catch (error) {
      console.error("Failed to fetch topics:", error);
      return ["Konular alınamadı."];
    }
  }
);


// Main flow for text-based conversation
export async function runCoach(history: CoachMessage[]) {
    const systemPrompt = `You are a friendly and encouraging AI Education Coach for a student. Your goal is to help them learn, understand complex topics, and develop good study habits. You must always communicate in Turkish.
    
    Your capabilities and instructions:
    - If the user asks for a topic explanation, use the getAvailableTopicsTool to see what subjects are already registered in the system to provide context-aware answers. Then explain the topic clearly.
    - If the user asks a follow-up question, answer it based on the conversation history.
    - If the user asks for study tips, provide them with encouragement and effective study strategies.
    - Do NOT attempt to analyze images in this text-based flow.
    `;
    
    const { stream } = await ai.generateStream({
      model: 'googleai/gemini-2.0-flash',
      tools: [getAvailableTopicsTool],
      history: history,
      prompt: systemPrompt,
    });
    
    return stream;
}

// Separate, dedicated flow for analyzing images
const ImageAnalysisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  studentQuery: z.string().optional().describe('An optional question from the student about the image.'),
});

export async function analyzeQuestionImage(input: z.infer<typeof ImageAnalysisInputSchema>): Promise<string> {
  
  const prompt = `You are an expert teacher. A student has sent you a photo of a question they are struggling with.
  
  Your task is to provide a clear, step-by-step solution in Turkish.
  1.  Analyze the image to understand the question.
  2.  If the student provided an additional query, take that into account.
  3.  Break down the solution into logical, easy-to-follow steps.
  4.  Finally, clearly state the final answer.
  
  Student's question: ${input.studentQuery || ''}
  The image with the problem: {{media url=photoDataUri}}
  `;
  
  const llmResponse = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: prompt,
    input: {
        photoDataUri: input.photoDataUri
    }
  });

  return llmResponse.text;
}
