
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { onQuestionBanksUpdate } from '@/lib/dataService';
import { QuestionBank } from '@/lib/data';

// Define schemas for chat history
const MediaPartSchema = z.object({
  url: z.string(),
});
const ContentPartSchema = z.object({
  text: z.string(),
  media: MediaPartSchema.optional(),
});
const CoachMessageSchema = z.object({
  role: z.enum(['user', 'model', 'tool']),
  content: z.array(ContentPartSchema),
  id: z.string().optional(),
});
export type CoachMessage = z.infer<typeof CoachMessageSchema>;

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

// Tool to analyze an image of a question
const analyzeQuestionImageTool = ai.defineTool(
  {
      name: 'analyzeQuestionImage',
      description: 'Kullanıcı bir soru fotoğrafı yüklediğinde, bu soruyu adım adım çözmek ve açıklamak için bu aracı kullan.',
      inputSchema: z.object({
          questionImage: z.string().describe("Sorunun Base64 kodlanmış data URI'ı."),
          studentQuery: z.string().optional().describe("Öğrencinin soruyla ilgili ek talebi."),
      }),
      outputSchema: z.string().describe("Sorunun adım adım, detaylı ve açıklayıcı çözümü."),
  },
  async ({ questionImage, studentQuery }) => {
    const prompt = `You are an expert tutor. A student has uploaded an image of a question they are struggling with. Your task is to provide a clear, step-by-step solution.

    1.  **Analyze the Question:** First, carefully analyze the provided image to understand the question.
    2.  **Step-by-Step Solution:** Break down the solution into logical, easy-to-follow steps. Explain the reasoning behind each step.
    3.  **Final Answer:** Clearly state the final answer.
    4.  **Student's Query:** Address any specific query the student has about the question: "${studentQuery || 'Yok'}"
    
    Here is the image:
    {{media url=questionImage}}
    
    Provide the solution in Turkish.`;

    const llmResponse = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.0-flash', // A model with vision capabilities
      input: {
        questionImage: questionImage,
        studentQuery: studentQuery || '', // Ensure studentQuery is always a string
      }
    });

    return llmResponse.text;
  }
);


// Main Education Coach Flow
const educationCoachFlow = ai.defineFlow(
  {
    name: 'educationCoachFlow',
    inputSchema: z.array(CoachMessageSchema),
    outputSchema: z.string(),
    stream: true,
  },
  async (history) => {
    const systemPrompt = `You are a friendly and encouraging AI Education Coach for a student. Your goal is to help them learn, understand complex topics, and develop good study habits.
    
    Your capabilities:
    - You can explain any academic subject. Use the getAvailableTopics tool to see what subjects are already registered in the system to provide context-aware answers.
    - You can analyze images of questions and provide step-by-step solutions using the analyzeQuestionImage tool.
    - You can answer follow-up questions.
    - You can provide study tips and encouragement.
    - You must always communicate in Turkish.`;

    const { stream } = ai.generateStream({
      model: 'googleai/gemini-2.0-flash',
      tools: [getAvailableTopicsTool, analyzeQuestionImageTool],
      history: history,
      prompt: systemPrompt,
    });
    
    return stream.text;
  }
);

export async function runCoach(history: CoachMessage[], newUserMessage: CoachMessage) {
    const fullHistory = [...history, newUserMessage];
    return educationCoachFlow(fullHistory);
}
