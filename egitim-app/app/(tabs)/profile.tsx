import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Users, Link as LinkIcon, Key, Copy, CheckCircle } from 'lucide-react-native';
import { useAuth } from '../../context/auth-context';
import { linkStudentToTeacher, getUsersByIds } from '../../lib/dataService';
import * as Clipboard from 'expo-clipboard';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const [teacherCodeInput, setTeacherCodeInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkedUsers, setLinkedUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [copied, setCopied] = useState(false);

  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    const fetchLinkedUsers = async () => {
      if (!profile) return;
      setIsLoadingUsers(true);
      
      const idsToFetch = isTeacher ? profile.studentIds : profile.teacherIds;
      
      if (idsToFetch && idsToFetch.length > 0) {
        const users = await getUsersByIds(idsToFetch);
        setLinkedUsers(users);
      } else {
        setLinkedUsers([]);
      }
      setIsLoadingUsers(false);
    };

    fetchLinkedUsers();
  }, [profile]);

  const handleLinkTeacher = async () => {
    if (!teacherCodeInput.trim() || !profile) return;
    
    setIsLinking(true);
    const success = await linkStudentToTeacher(profile.id, teacherCodeInput.trim());
    if (success) {
      Alert.alert("Başarılı", "Öğretmeninize başarıyla bağlandınız! Lütfen sayfayı yenileyin.");
      setTeacherCodeInput('');
    } else {
      Alert.alert("Hata", "Öğretmen kodu bulunamadı veya bir hata oluştu.");
    }
    setIsLinking(false);
  };

  const copyToClipboard = async () => {
    if (profile?.teacherCode) {
      await Clipboard.setStringAsync(profile.teacherCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!profile) return null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1 p-4">
        <View className="items-center mb-8 mt-4">
          <View className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mb-4">
            <UserIcon size={48} color="#4f46e5" />
          </View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {profile.name}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 mt-1 capitalize">
            {profile.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'} Profili
          </Text>
        </View>

        {isTeacher ? (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center mb-4">
              <Key size={20} color="#4f46e5" />
              <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">Öğretmen Kodunuz</Text>
            </View>
            <Text className="text-gray-600 dark:text-gray-400 mb-4">
              Öğrencilerinize bu kodu vererek size bağlanmalarını sağlayabilirsiniz.
            </Text>
            
            <TouchableOpacity 
              onPress={copyToClipboard}
              className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl flex-row items-center justify-between border border-indigo-100 dark:border-indigo-800"
            >
              <Text className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">
                {profile.teacherCode || 'YOK'}
              </Text>
              {copied ? (
                <CheckCircle size={24} color="#10b981" />
              ) : (
                <Copy size={24} color="#4f46e5" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center mb-4">
              <LinkIcon size={20} color="#4f46e5" />
              <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">Öğretmene Bağlan</Text>
            </View>
            <Text className="text-gray-600 dark:text-gray-400 mb-4">
              Öğretmeninizden aldığınız 6 haneli kodu buraya girin.
            </Text>
            
            <View className="flex-row items-center">
              <TextInput
                value={teacherCodeInput}
                onChangeText={setTeacherCodeInput}
                placeholder="Örn: A1B2C3"
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                maxLength={6}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mr-3 text-gray-900 dark:text-white font-mono text-lg tracking-widest"
              />
              <TouchableOpacity
                onPress={handleLinkTeacher}
                disabled={isLinking || teacherCodeInput.length < 5}
                className={`bg-indigo-600 px-6 py-3 rounded-xl justify-center items-center ${
                  isLinking || teacherCodeInput.length < 5 ? 'opacity-50' : ''
                }`}
              >
                {isLinking ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Bağlan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center mb-4">
            <Users size={20} color="#4f46e5" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white ml-2">
              {isTeacher ? 'Öğrencilerim' : 'Öğretmenlerim'}
            </Text>
          </View>
          
          {isLoadingUsers ? (
            <ActivityIndicator color="#4f46e5" className="my-4" />
          ) : linkedUsers.length > 0 ? (
            <View className="space-y-3">
              {linkedUsers.map(user => (
                <View key={user.id} className="flex-row items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mr-3">
                    <UserIcon size={20} color="#4f46e5" />
                  </View>
                  <View>
                    <Text className="text-gray-900 dark:text-white font-semibold">{user.name}</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
              {isTeacher 
                ? "Henüz size bağlanan bir öğrenci yok." 
                : "Henüz bir öğretmene bağlı değilsiniz."}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={logout}
          className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl flex-row items-center justify-center mb-10"
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="text-red-500 font-bold ml-2">Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
