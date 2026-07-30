import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ChevronLeft, User, BookOpen } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onBooksUpdate } from '../lib/dataService';
import { Book } from '../lib/data';

export default function AuthorDetailScreen() {
  const router = useRouter();
  const { authorName } = useLocalSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorName) return;
    const unsubscribe = onBooksUpdate((data) => {
      const authorBooks = data?.filter(b => b.author?.toLowerCase() === (authorName as string).toLowerCase()) || [];
      setBooks(authorBooks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [authorName]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Yazar Profili</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="items-center justify-center mt-6 mb-8">
            <View className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
               <User size={48} color="#3b82f6" />
            </View>
            <Text className="text-slate-800 dark:text-slate-100 text-2xl font-bold text-center">{authorName}</Text>
            <Text className="text-slate-500 font-medium mt-1">Kütüphanede {books.length} Kitabı Var</Text>
         </View>

         {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" />
         ) : (
            <View>
               <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-2">Yazarın Kitapları</Text>
               {books.map(book => (
                 <TouchableOpacity 
                   key={book.id} 
                   className="bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center"
                   onPress={() => router.push({ pathname: '/book-detail', params: { id: book.id } })}
                 >
                    <View className="w-12 h-16 bg-slate-200 dark:bg-slate-800 rounded-md items-center justify-center mr-4">
                       <BookOpen size={20} color="#64748b" />
                    </View>
                    <View className="flex-1">
                       <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg" numberOfLines={1}>{book.title}</Text>
                       <Text className="text-slate-500 text-sm">{book.pageCount ? `${book.pageCount} Sayfa` : 'Sayfa sayısı bilinmiyor'}</Text>
                    </View>
                 </TouchableOpacity>
               ))}
            </View>
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
