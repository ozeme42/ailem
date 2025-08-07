
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

const analyzeImagePrompt = ai.definePrompt(
    {
        name: 'analyzeImagePrompt',
        input: {
            schema: z.object({
                questionImage: z.string().describe("Sorunun Base64 kodlanmış data URI'ı."),
                studentQuery: z.string().describe("Öğrencinin soruyla ilgili ek talebi."),
            }),
        },
        prompt: `You are an expert tutor. A student has uploaded an image of a question they are struggling with. Your task is to provide a clear, step-by-step solution in Turkish.

        1.  **Analyze the Question:** First, carefully analyze the provided image to understand the question.
        2.  **Step-by-Step Solution:** Break down the solution into logical, easy-to-follow steps. Explain the reasoning behind each step.
        3.  **Final Answer:** Clearly state the final answer.
        4.  **Student's Query:** Address the student's additional query if they provided one: "{{studentQuery}}"
        
        Image of the question is below:
        {{media url=questionImage}}
        `,
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
    
    const systemPrompt = `You are a friendly and encouraging AI Education Coach for a student. Your goal is to help them learn, understand complex topics, and develop good study habits.
    
    Your capabilities:
    - You can explain any academic subject. Use the getAvailableTopicsTool to see what subjects are already registered in the system to provide context-aware answers.
    - You can analyze images of questions and provide step-by-step solutions.
    - You can answer follow-up questions.
    - You can provide study tips and encouragement.
    - You must always communicate in Turkish.`;
    
    // Check if the last message contains an image
    const lastMessage = history[history.length - 1];
    const imagePart = lastMessage.content.find((part: any) => part.media?.url);
    
    if (imagePart?.media?.url) {
        // If there's an image, use the specific image analysis prompt
        const textPart = lastMessage.content.find((part: any) => part.text);
        const studentQuery = textPart?.text || '';

        const { stream } = await ai.generateStream({
            prompt: analyzeImagePrompt,
            input: {
                questionImage: imagePart.media.url,
                studentQuery: studentQuery
            }
        });
        return stream.text;

    } else {
        // If no image, proceed with the general-purpose generative model
        const { stream } = await ai.generateStream({
          model: 'googleai/gemini-2.0-flash',
          tools: [getAvailableTopicsTool],
          history: history,
          prompt: systemPrompt,
        });
        
        return stream.text;
    }
  }
);

export async function runCoach(history: CoachMessage[]) {
    return educationCoachFlow(history);
}
