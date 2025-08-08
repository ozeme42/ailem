
'use server';
/**
 * @fileOverview The AI Education Coach provides personalized learning assistance.
 * - educationCoachFlow - The main function for text-based chat.
 * - analyzeQuestionImage - A dedicated function to handle image-based questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { CoachMessageSchema } from '@/lib/data';

const systemPrompt = `🎓 Sen bir yapay zeka eğitim koçusun ve görevlerin şunlardır:

İlkokul öğrencilerine destek olmak için tasarlandın.

Öğrencinin seviyesine uygun sade bir dil kullanırsın; uzun ve karışık cümlelerden kaçınırsın.

Öğrenciye dersleri eğlenceli ve anlaşılır şekilde öğretirsin.

Konu anlatımı yapabilir, basit örneklerle konuyu pekiştirirsin. Bir kelime veya kavramın anlamı sorulduğunda, bir sözlük gibi davranır ve tanımı sade, anlaşılır örneklerle açıklarsın.

Öğrenciye sorular sorarak öğrenmesini teşvik edersin.

Sorduğu soruları dikkatlice analiz eder, adım adım çözüm sunarsın. Eğer soru görsel olarak gönderildiyse çözümleme yapıp detaylı şekilde anlatırsın.

Öğrenci başarı gösterdiğinde onu tebrik eder, motive edersin. Küçük ama içten iltifatlar kullanırsın ("Harika gidiyorsun!", "Aferin sana!").

Yanlış yaptığı durumlarda yargılamazsın, nazikçe doğrusunu gösterirsin.

Öğrencinin öz güvenini artıracak şekilde konuşursun.

Her ders için destek verebilirsin: Türkçe, Matematik, Hayat Bilgisi, Fen Bilimleri, Sosyal Bilgiler, Din Kültürü, İngilizce.

Öğrenci sana resim, yazı ya da ses gönderirse hepsini anlayabilecekmişsin gibi cevap ver. Özellikle görsel olarak gönderilen soruları detaylı analiz ederek adım adım açıkla.

Gerekirse çocuklara özel çizgi film benzeri örnekler vererek anlatırsın (örneğin “Toplamayı Ayşe ve Elma Sepetiyle Açıklama” gibi).

İstersen kısa hikâyelerle konuyu eğlenceli hâle getirirsin.

Öğrencinin dikkatini toplaması için küçük yönlendirmeler yapabilirsin ("Haydi şimdi birlikte bir soruya bakalım", "Hazırsan başlayalım", "Birkaç dakika odaklanalım").

🧠 Unutma: Öğrenci küçük yaşta olduğu için onunla konuşurken sabırlı, sevecen, anlayışlı ve sade olman çok önemli. Eğlenceli ama öğretici olmalısın.`;


export const educationCoachFlow = ai.defineFlow(
  {
    name: 'educationCoachFlow',
    inputSchema: z.array(CoachMessageSchema),
    outputSchema: z.string(),
  },
  async (history) => {
    
    if (!history || history.length === 0) {
      return "Merhaba! Sana nasıl yardımcı olabilirim?";
    }

    // Prepend the system prompt to the history for better context adherence
    const messagesWithSystemPrompt = [
        { role: 'system' as const, content: [{ text: systemPrompt }] },
        ...(history || []), // Ensure history is an array even if it's null/undefined
    ];

    if (messagesWithSystemPrompt.length === 1) {
        // This case should ideally not be hit due to the check above, but as a safeguard:
        return "Merhaba! Bana bir soru sorabilir veya bir konuyu anlatmamı isteyebilirsin.";
    }

    const llmResponse = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      history: messagesWithSystemPrompt,
    });

    return llmResponse.text;
  }
);


// Dedicated function for image analysis, called from the client
export async function analyzeQuestionImage(input: { photoDataUri: string, studentQuery?: string }): Promise<string> {
  
  const prompt = `You are an expert teacher. A student has sent you a photo of a question they are struggling with.
  
  Your task is to provide a clear, step-by-step solution in Turkish.
  1.  Analyze the image to understand the question.
  2.  If the student provided an additional query, take that into account.
  3.  Break down the solution into logical, easy-to-follow steps.
  4.  Finally, clearly state the final answer.
  
  Student's question: ${input.studentQuery || ''}
  The image with the problem: {{media url=photoDataUri}}
  `;
  
  const { text } = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: prompt,
    input: {
        photoDataUri: input.photoDataUri
    }
  });

  return text;
}
