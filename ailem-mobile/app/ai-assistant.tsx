import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Bot, ChevronLeft, Send, Sparkles, Image as ImageIcon, ShoppingCart, Book } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function AiAssistantScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: 'Merhaba! Aile Asistanı burada. Yemek loglarını analiz edebilir, otomatik alışveriş listesi oluşturabilir, resimlerden veri çıkarabilir veya kitap arayabilirim. Size nasıl yardımcı olabilirim?' }
  ]);

  const handleSend = () => {
    if (!prompt.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    setPrompt('');
    setLoading(true);

    // Simulate AI response for the Genkit flows (analyze-food, generate-shopping, search-books)
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Bu özellik şu anda Firebase Genkit entegrasyonu bekliyor. İstediğiniz akış (analyze-food-log, generate-shopping-list, search-books vb.) yakında doğrudan mobil istemciden tetiklenebilecek!' 
      }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <View className="flex-row items-center">
           <Sparkles size={20} color="#8b5cf6" className="mr-2" />
           <Text className="text-xl font-bold text-slate-900 dark:text-white">Yapay Zeka Asistanı</Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4 flex-grow" showsVerticalScrollIndicator={false}>
         
         <View className="flex-row justify-around mb-6">
            <TouchableOpacity className="items-center">
               <View className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-full items-center justify-center mb-1">
                  <Bot size={24} color="#f97316" />
               </View>
               <Text className="text-xs text-slate-500 font-medium text-center">Yemek{'\n'}Analizi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="items-center">
               <View className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-full items-center justify-center mb-1">
                  <ShoppingCart size={24} color="#0ea5e9" />
               </View>
               <Text className="text-xs text-slate-500 font-medium text-center">Alışveriş{'\n'}Listesi</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center">
               <View className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full items-center justify-center mb-1">
                  <Book size={24} color="#10b981" />
               </View>
               <Text className="text-xs text-slate-500 font-medium text-center">Kitap{'\n'}Arama</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center">
               <View className="w-12 h-12 bg-pink-50 dark:bg-pink-900/30 rounded-full items-center justify-center mb-1">
                  <ImageIcon size={24} color="#ec4899" />
               </View>
               <Text className="text-xs text-slate-500 font-medium text-center">Görsel{'\n'}Tarama</Text>
            </TouchableOpacity>
         </View>

         {messages.map((m, i) => (
           <View key={i} className={`mb-4 flex-row ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <View className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 items-center justify-center mr-2 mt-1">
                  <Bot size={16} color="#8b5cf6" />
                </View>
              )}
              <View className={`p-4 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-violet-500 rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none shadow-sm'}`}>
                 <Text className={`text-base ${m.role === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                   {m.text}
                 </Text>
              </View>
           </View>
         ))}

         {loading && (
           <View className="flex-row justify-start mb-4">
              <View className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 items-center justify-center mr-2 mt-1">
                <Bot size={16} color="#8b5cf6" />
              </View>
              <View className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none shadow-sm flex-row items-center">
                 <ActivityIndicator size="small" color="#8b5cf6" />
                 <Text className="ml-2 text-slate-500">Düşünüyor...</Text>
              </View>
           </View>
         )}
      </ScrollView>

      {/* Message Input Container */}
      <View className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
         <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
            <TextInput 
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Yapay zeka asistanına sorun..."
              placeholderTextColor="#94a3b8"
              className="flex-1 text-slate-900 dark:text-white h-10 font-medium"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity 
              onPress={handleSend}
              className={`w-10 h-10 rounded-full items-center justify-center ${prompt.trim() ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              disabled={!prompt.trim() || loading}
            >
               <Send size={18} color="white" className="ml-1" />
            </TouchableOpacity>
         </View>
      </View>
    </SafeAreaView>
  );
}
