import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Video as VideoIcon, User } from 'lucide-react-native';
import { FamilyMember } from '../lib/data';

export interface NewVideoData {
  title: string;
  totalVideos: number;
  url?: string;
  tags: string[];
  assigneeId: string;
  platform: 'YouTube' | 'Other';
}

interface NewVideoFormProps {
  initialData?: NewVideoData;
  familyMembers: FamilyMember[];
  onSubmit: (data: NewVideoData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function NewVideoForm({ initialData, familyMembers, onSubmit, onCancel, submitLabel = "Ekle" }: NewVideoFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [totalVideos, setTotalVideos] = useState(initialData?.totalVideos?.toString() || '1');
  const [url, setUrl] = useState(initialData?.url || '');
  
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [assigneeId, setAssigneeId] = useState<string>(initialData?.assigneeId || '');

  const handleSubmit = () => {
    if (!title.trim() || !assigneeId) return;

    let platform: 'YouTube' | 'Other' = 'Other';
    if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'YouTube';

    onSubmit({
      title: title.trim(),
      totalVideos: parseInt(totalVideos) || 1,
      url: url.trim() || undefined,
      tags,
      assigneeId,
      platform
    });
  };

  const addTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleAssignee = (memberId: string) => {
    setAssigneeId(memberId);
  };

  return (
    <ScrollView className="flex-1 px-6 pt-4 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View className="mb-6">
        <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Eğitim Başlığı *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Örn: React Native Dersleri"
          placeholderTextColor="#8E8E93"
          className="h-14 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 text-[#1C1C1E] dark:text-white font-medium"
        />
      </View>

      <View className="flex-row justify-between mb-6">
        <View className="w-[48%]">
          <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Toplam Video</Text>
          <TextInput
            value={totalVideos}
            onChangeText={setTotalVideos}
            placeholder="Örn: 10"
            keyboardType="numeric"
            placeholderTextColor="#8E8E93"
            className="h-14 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 text-[#1C1C1E] dark:text-white font-medium"
          />
        </View>
        <View className="w-[48%]">
          <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">YouTube Linki (Opsiyonel)</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://..."
            placeholderTextColor="#8E8E93"
            keyboardType="url"
            autoCapitalize="none"
            className="h-14 bg-slate-100 dark:bg-[#2C2C2E] rounded-2xl px-4 text-[#1C1C1E] dark:text-white font-medium"
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-2 ml-1">Kategoriler / Raflar</Text>
        <View className="flex-row mb-3">
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Yeni raf (Örn: Yazılım)"
              placeholderTextColor="#8E8E93"
              className="flex-1 h-12 bg-slate-100 dark:bg-[#2C2C2E] rounded-xl px-4 text-[#1C1C1E] dark:text-white font-medium mr-2"
              onSubmitEditing={addTag}
            />
            <TouchableOpacity onPress={addTag} className="bg-rose-500 h-12 w-16 items-center justify-center rounded-xl">
                <Text className="text-white font-bold">Ekle</Text>
            </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2">
            {tags.map(tag => (
                <TouchableOpacity key={tag} onPress={() => removeTag(tag)} className="bg-rose-100 dark:bg-rose-500/20 px-3 py-1.5 rounded-lg flex-row items-center">
                    <Text className="text-rose-700 dark:text-rose-300 font-medium mr-2">{tag}</Text>
                    <Text className="text-rose-500 dark:text-rose-400 text-xs font-bold">X</Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>

      {/* Atanan Kişiler */}
      {familyMembers.length > 0 && (
        <View className="mb-8">
          <Text className="text-[#1C1C1E] dark:text-white text-sm font-semibold mb-3 ml-1">Kimler İzleyecek?</Text>
          <View className="flex-row flex-wrap gap-3">
            {familyMembers.map(member => {
              const isSelected = assigneeId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => toggleAssignee(member.id)}
                  className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${isSelected ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: member.color || '#64748b', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text className={`font-semibold text-sm ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <View className="flex-row gap-3 mb-10">
        <TouchableOpacity 
            onPress={onCancel}
            className="flex-1 h-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-[#3A3A3C]"
        >
            <Text className="text-[#1C1C1E] dark:text-white font-semibold text-base">İptal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            onPress={handleSubmit}
            disabled={!title.trim() || !assigneeId}
            className={`flex-1 h-14 items-center justify-center rounded-2xl flex-row gap-2 ${title.trim() && assigneeId ? 'bg-rose-500' : 'bg-rose-500/50'}`}
        >
            <VideoIcon size={20} color="white" />
            <Text className="text-white font-semibold text-base">{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
