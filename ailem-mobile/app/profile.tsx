// FORCE_RELOAD_TIMESTAMP=639189374255600887
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { ChevronLeft, Mail, Star, Award, Shield, Key, Plus, Edit2, Trash2, X, Check, Users } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../context/auth-context';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import type { FamilyMember } from '../lib/data';

const PRESET_AVATARS = ['👨', '👩', '👧', '👦', '👶', '🦁', '🐼', '🦊', '🦄', '🦖', '🚀', '🎨', '🎸', '⚽'];
const PRESET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#f97316', '#14b8a6'];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, familyId, familyMembers, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'security'>('overview');
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: 'error' as 'error' | 'success' });

  // Member management state
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'Baba' | 'Anne' | 'Kız Çocuk' | 'Erkek Çocuk' | 'Bebek'>('Kız Çocuk');
  const [memberAvatar, setMemberAvatar] = useState('👧');
  const [memberColor, setMemberColor] = useState('#6366f1');
  const [memberLoading, setMemberLoading] = useState(false);

  const currentUserMember = familyMembers?.find(m => m.name === user?.email?.split('@')[0]) || familyMembers?.[0];

  // 1. Password change logic
  const handleChangePassword = async () => {
    setPasswordMessage({ text: '', type: 'error' });
    if (!newPassword || !confirmPassword) {
      setPasswordMessage({ text: 'Lütfen tüm alanları doldurun.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: 'Şifre en az 6 karakter olmalıdır.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Şifreler eşleşmiyor.', type: 'error' });
      return;
    }

    try {
      setPasswordLoading(true);
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordMessage({ text: 'Şifreniz başarıyla güncellendi.', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ text: 'Kullanıcı oturumu bulunamadı.', type: 'error' });
      }
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        setPasswordMessage({ text: 'Güvenlik nedeniyle şifre değiştirmeden önce tekrar giriş yapmalısınız.', type: 'error' });
      } else {
        setPasswordMessage({ text: e.message || 'Şifre değiştirilirken hata oluştu.', type: 'error' });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // 2. Member management logic
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setMemberName('');
    setMemberRole('Kız Çocuk');
    setMemberAvatar('👧');
    setMemberColor('#6366f1');
    setMemberModalVisible(true);
  };

  const handleOpenEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setMemberName(member.name);
    setMemberRole(member.role);
    setMemberAvatar(member.avatar || '👧');
    setMemberColor(member.color || '#6366f1');
    setMemberModalVisible(true);
  };

  const handleSaveMember = async () => {
    if (!memberName.trim()) return;
    if (!familyId) return;

    try {
      setMemberLoading(true);
      let updatedMembers = [...familyMembers];

      if (editingMember) {
        // Edit existing member
        updatedMembers = familyMembers.map(m => 
          m.id === editingMember.id 
            ? { ...m, name: memberName.trim(), role: memberRole, avatar: memberAvatar, color: memberColor } 
            : m
        );
      } else {
        // Add new member
        const newMember: FamilyMember = {
          id: Math.random().toString(36).substring(7),
          name: memberName.trim(),
          role: memberRole,
          avatar: memberAvatar,
          color: memberColor,
          completedTasks: 0,
          level: 1,
          xp: 0,
          streak: 0,
          badges: [],
          mood: 'happy',
          status: 'offline'
        };
        updatedMembers.push(newMember);
      }

      await updateDoc(doc(db, 'families', familyId), { members: updatedMembers });
      setMemberModalVisible(false);
    } catch (e) {
      console.log('Error saving member:', e);
    } finally {
      setMemberLoading(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!familyId) return;
    
    try {
      const updatedMembers = familyMembers.filter(m => m.id !== id);
      await updateDoc(doc(db, 'families', familyId), { members: updatedMembers });
    } catch (e) {
      console.log('Error deleting member:', e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Profil & Ayarlar</Text>
        <View className="w-10 h-10" />
      </View>

      {/* Tabs Bar */}
      <View className="flex-row bg-white dark:bg-slate-900 p-2 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity 
          onPress={() => setActiveTab('overview')}
          className={`flex-1 py-3 items-center rounded-2xl ${activeTab === 'overview' ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
        >
          <Mail size={20} color={activeTab === 'overview' ? '#6366f1' : '#94a3b8'} />
          <Text className={`text-xs font-bold mt-1 ${activeTab === 'overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>Genel Bakış</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setActiveTab('members')}
          className={`flex-1 py-3 items-center rounded-2xl ${activeTab === 'members' ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
        >
          <Users size={20} color={activeTab === 'members' ? '#6366f1' : '#94a3b8'} />
          <Text className={`text-xs font-bold mt-1 ${activeTab === 'members' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>Aile Üyeleri</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab('security')}
          className={`flex-1 py-3 items-center rounded-2xl ${activeTab === 'security' ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
        >
          <Key size={20} color={activeTab === 'security' ? '#6366f1' : '#94a3b8'} />
          <Text className={`text-xs font-bold mt-1 ${activeTab === 'security' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>Güvenlik</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View>
            <View className="items-center mt-4 mb-6">
              <View className="w-28 h-28 bg-indigo-100 dark:bg-indigo-900/50 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-900 shadow-sm">
                <Text className="text-4xl">
                  {currentUserMember?.avatar || '👤'}
                </Text>
              </View>
              <Text className="text-xl font-bold text-slate-800 dark:text-white mb-1">
                {currentUserMember?.name || user?.email?.split('@')[0]}
              </Text>
              <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <Mail size={14} color="#64748b" />
                <Text className="text-slate-500 ml-2 text-xs">{user?.email}</Text>
              </View>
            </View>

            <View className="flex-row justify-between mb-6">
              <View className="w-[31%] bg-white dark:bg-slate-900 p-4 rounded-3xl items-center shadow-sm border border-slate-100 dark:border-slate-800">
                <Award size={28} color="#f59e0b" className="mb-2" />
                <Text className="text-xl font-bold text-slate-800 dark:text-white">{currentUserMember?.level || 1}</Text>
                <Text className="text-slate-500 text-[10px] mt-1 font-semibold uppercase">Seviye</Text>
              </View>
              <View className="w-[31%] bg-white dark:bg-slate-900 p-4 rounded-3xl items-center shadow-sm border border-slate-100 dark:border-slate-800">
                <Star size={28} color="#6366f1" className="mb-2" />
                <Text className="text-xl font-bold text-slate-800 dark:text-white">{currentUserMember?.xp || 0}</Text>
                <Text className="text-slate-500 text-[10px] mt-1 font-semibold uppercase">XP</Text>
              </View>
              <View className="w-[31%] bg-white dark:bg-slate-900 p-4 rounded-3xl items-center shadow-sm border border-slate-100 dark:border-slate-800">
                <Shield size={28} color="#10b981" className="mb-2" />
                <Text className="text-sm font-bold text-slate-800 dark:text-white" numberOfLines={1}>{currentUserMember?.role || 'Üye'}</Text>
                <Text className="text-slate-500 text-[10px] mt-1 font-semibold uppercase">Rol</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={logout}
              className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl items-center mt-4 border border-red-100 dark:border-red-900/30"
            >
              <Text className="text-red-500 font-bold text-base">Oturumu Kapat</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'members' && (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">Aile Bireyleri</Text>
              <TouchableOpacity 
                onPress={handleOpenAddModal}
                className="flex-row items-center bg-indigo-500 px-3 py-2 rounded-xl"
              >
                <Plus size={16} color="white" />
                <Text className="text-white font-bold text-xs ml-1">Yeni Üye</Text>
              </TouchableOpacity>
            </View>

            {familyMembers.map((member) => (
              <View key={member.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex-row items-center justify-between mb-3 border border-slate-100 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-center flex-1">
                  <View 
                    style={{ backgroundColor: member.color || '#6366f1' }}
                    className="w-12 h-12 rounded-full items-center justify-center mr-3 shadow-inner"
                  >
                    <Text className="text-2xl">{member.avatar || '👧'}</Text>
                  </View>
                  <View>
                    <Text className="text-base font-bold text-slate-900 dark:text-white">{member.name}</Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 capitalize">{member.role}</Text>
                  </View>
                </View>
                
                <View className="flex-row space-x-2">
                  <TouchableOpacity 
                    onPress={() => handleOpenEditModal(member)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"
                  >
                    <Edit2 size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteMember(member.id)}
                    className="p-2 bg-red-50 dark:bg-red-950/30 rounded-xl"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'security' && (
          <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mt-2">
            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-4">Şifre Değiştir</Text>

            {passwordMessage.text ? (
              <View className={`p-3 rounded-xl mb-4 ${passwordMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100' : 'bg-red-50 dark:bg-red-950/20 border border-red-100'}`}>
                <Text className={`text-sm text-center ${passwordMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{passwordMessage.text}</Text>
              </View>
            ) : null}

            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Yeni Şifre</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholder="Yeni şifrenizi girin"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-white"
              />
            </View>

            <View className="mb-6">
              <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Şifre Tekrar</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Yeni şifrenizi doğrulayın"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-white"
              />
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={passwordLoading}
              className="bg-indigo-500 p-4 rounded-xl items-center shadow-sm"
            >
              {passwordLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Şifreyi Güncelle</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Member Management Modal */}
      <Modal
        visible={memberModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMemberModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[32px] p-6 max-h-[90%]">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-slate-900 dark:text-white">
                {editingMember ? 'Üye Bilgilerini Düzenle' : 'Yeni Aile Üyesi Ekle'}
              </Text>
              <TouchableOpacity 
                onPress={() => setMemberModalVisible(false)}
                className="w-8 h-8 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <ScrollView showsVerticalScrollIndicator={false} className="space-y-6 mb-6">
              {/* Name */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">İsim</Text>
                <TextInput
                  value={memberName}
                  onChangeText={setMemberName}
                  placeholder="Üye adı girin"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-white"
                />
              </View>

              {/* Role Selection */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Rol</Text>
                <View className="flex-row flex-wrap gap-2">
                  {(['Anne', 'Baba', 'Kız Çocuk', 'Erkek Çocuk', 'Bebek'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      onPress={() => setMemberRole(role)}
                      className={`px-4 py-2 rounded-xl border ${memberRole === role ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                    >
                      <Text className={`font-bold text-xs ${memberRole === role ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                        {role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Color Selection */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Tema Rengi</Text>
                <View className="flex-row space-x-3">
                  {PRESET_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setMemberColor(color)}
                      style={{ backgroundColor: color }}
                      className="w-8 h-8 rounded-full items-center justify-center shadow-inner"
                    >
                      {memberColor === color && (
                        <Check size={14} color="white" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Avatar Selection */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase">Avatar Emojisi</Text>
                <View className="flex-row flex-wrap gap-3">
                  {PRESET_AVATARS.map((avatar) => (
                    <TouchableOpacity
                      key={avatar}
                      onPress={() => setMemberAvatar(avatar)}
                      className={`w-12 h-12 items-center justify-center rounded-2xl ${memberAvatar === avatar ? 'bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500' : 'bg-slate-50 dark:bg-slate-900'}`}
                    >
                      <Text className="text-2xl">{avatar}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveMember}
              disabled={memberLoading}
              className="bg-indigo-500 p-4 rounded-xl items-center shadow-sm mb-4"
            >
              {memberLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Değişiklikleri Kaydet</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
