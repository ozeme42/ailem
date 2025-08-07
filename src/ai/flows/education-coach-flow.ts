
'use server';
/**
 * @fileOverview The AI Education Coach provides personalized learning assistance.
 * - runCoach - The main function to interact with the coach.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { onQuestionBanksUpdate } from '@/lib/dataService';
import type { QuestionBank, CoachMessage } from '@/lib/data';


// Tool to get available subjects and topics
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

// Main Education Coach Flow
const educationCoachFlow = ai.defineFlow(
  {
    name: 'educationCoachFlow',
    inputSchema: z.array(z.any()),
    outputSchema: z.string(),
    stream: true,
  },
  async (history) => {
    
    const systemPrompt = `You are a friendly and encouraging AI Education Coach for a student. Your goal is to help them learn, understand complex topics, and develop good study habits. You must always communicate in Turkish.

    Your capabilities and instructions:
    - If the user provides an image, it's likely a question they are struggling with. Your primary task is to provide a clear, step-by-step solution in Turkish. First, analyze the image to understand the question. Then, break down the solution into logical, easy-to-follow steps. Finally, clearly state the final answer.
    - If the user asks for a topic explanation, use the getAvailableTopicsTool to see what subjects are already registered in the system to provide context-aware answers. Then explain the topic clearly.
    - If the user asks a follow-up question, answer it based on the conversation history.
    - If the user asks for study tips, provide them with encouragement and effective study strategies.
    `;
    
    const { stream } = await ai.generateStream({
      model: 'googleai/gemini-2.0-flash',
      tools: [getAvailableTopicsTool],
      history: history,
      prompt: systemPrompt,
    });
    
    return stream.text;
  }
);

export async function runCoach(history: CoachMessage[]) {
    return educationCoachFlow(history);
}
