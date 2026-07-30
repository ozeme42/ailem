import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { onRecipesUpdate } from '../lib/dataService';
import { Recipe } from '../lib/data';
import { ChefHat, ChevronLeft, Plus, Clock, Star } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onRecipesUpdate((data: Recipe[]) => {
        setRecipes(data);
        setLoading(false);
      });
    } catch (e) {
      console.log('Error fetching recipes:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#f43f5e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Yemek Tarifleri</Text>
        <TouchableOpacity className="bg-rose-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         
         {recipes.length === 0 ? (
           <View className="items-center justify-center mt-20">
             <View className="w-20 h-20 bg-rose-50 dark:bg-rose-900/30 rounded-full items-center justify-center mb-4">
                <ChefHat size={40} color="#f43f5e" />
             </View>
             <Text className="text-slate-500 text-lg font-medium text-center">Henüz kaydedilmiş tarif yok.</Text>
           </View>
         ) : (
           recipes.map(recipe => (
             <TouchableOpacity key={recipe.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center mb-3">
                   <View className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-xl items-center justify-center mr-4">
                      <ChefHat size={24} color="#f43f5e" />
                   </View>
                   <View className="flex-1">
                      <Text className="font-bold text-slate-800 dark:text-slate-100 text-lg">{recipe.title}</Text>
                      <Text className="text-slate-500 text-sm">{recipe.category || 'Genel'}</Text>
                   </View>
                </View>
                <View className="flex-row items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                   <Star size={16} color="#f59e0b" />
                   <Text className="text-slate-600 dark:text-slate-300 ml-2 font-medium">Puan: {recipe.rating || 'Puanlanmamış'}</Text>
                </View>
             </TouchableOpacity>
           ))
         )}
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}
