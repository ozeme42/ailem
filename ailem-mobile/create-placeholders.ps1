$Files = @(
    "all-tests.tsx", "education-category.tsx", "assign-test.tsx", "exam-detail.tsx",
    "plan-detail.tsx", "education-results.tsx", "retake-test.tsx", "education-stats.tsx",
    "study-mode.tsx", "test-session.tsx", "library-all.tsx", "library-archive.tsx",
    "author-detail.tsx", "reading-session-detail.tsx", "library-stats.tsx",
    "author-stats.tsx", "page-stats.tsx", "memorization-detail.tsx", "profile-detail.tsx",
    "tracking.tsx"
)

foreach ($File in $Files) {
    $Name = $File.Replace('.tsx', '').Replace('-', ' ')
    $Name = (Get-Culture).TextInfo.ToTitleCase($Name).Replace(' ', '')
    
    $Content = @"
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

export default function $($Name)Screen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">$($File.Replace('.tsx', ''))</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         <View className="items-center justify-center mt-10">
           <View className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-4">
              <Info size={40} color="#6366f1" />
           </View>
           <Text className="text-slate-500 text-lg font-medium text-center">Bu sayfa detay/alt modül amaçlıdır.</Text>
           <Text className="text-slate-400 text-sm mt-4 text-center">{JSON.stringify(params)}</Text>
         </View>
      </ScrollView>
    </SafeAreaView>
  );
}
"@
    Set-Content -Path "E:\ailem\ailem-mobile\app\$File" -Value $Content -Encoding UTF8
    Write-Host "Created $File"
}
