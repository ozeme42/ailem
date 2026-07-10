import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { onVideosUpdate, updateVideo, addVideo, deleteVideo } from '../lib/dataService';
import { Video as VideoType, FamilyMember } from '../lib/data';
import { ChevronLeft, Plus, PlayCircle, FolderOpen, ChevronDown, MoreVertical, Edit, Trash2, CheckCircle, Video } from 'lucide-react-native';
import { useRouter, Stack } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '../context/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import NewVideoForm, { NewVideoData } from '../components/NewVideoForm';

// Theme Colors for Shelves
const shelfColors = [
    { start: '#eff6ff', end: '#e0e7ff', text: '#1e3a8a', subtext: '#2563eb', bar: '#3b82f6', barBg: '#dbeafe' }, // Blue
    { start: '#ecfdf5', end: '#ccfbf1', text: '#064e3b', subtext: '#059669', bar: '#10b981', barBg: '#d1fae5' }, // Emerald
    { start: '#fffbeb', end: '#fff7ed', text: '#78350f', subtext: '#d97706', bar: '#f59e0b', barBg: '#fef3c7' }, // Amber
    { start: '#fff1f2', end: '#fdf2f8', text: '#881337', subtext: '#e11d48', bar: '#f43f5e', barBg: '#ffe4e6' }, // Rose
    { start: '#f5f3ff', end: '#faf5ff', text: '#4c1d95', subtext: '#7c3aed', bar: '#8b5cf6', barBg: '#ede9fe' }, // Violet
    { start: '#ecfeff', end: '#f0f9ff', text: '#164e63', subtext: '#0891b2', bar: '#06b6d4', barBg: '#cffafe' }, // Cyan
];

// Quick Select Grid Modal Component
function QuickSelectModal({ visible, total, current, onClose, onSelect }: { visible: boolean, total: number, current: number, onClose: () => void, onSelect: (val: number) => void }) {
  const numbers = Array.from({ length: total + 1 }, (_, i) => i);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={onClose}>
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-5/6 max-h-[70%] shadow-2xl border border-slate-200 dark:border-slate-800" onStartShouldSetResponder={() => true}>
          <Text className="text-lg font-bold text-slate-800 dark:text-white mb-4">Hızlı Seçim</Text>
          <ScrollView contentContainerClassName="flex-row flex-wrap justify-center gap-2">
            {numbers.map(num => (
              <TouchableOpacity
                key={num}
                onPress={() => onSelect(num)}
                className={`w-12 h-12 rounded-xl items-center justify-center border ${current === num ? 'bg-rose-500 border-rose-500 shadow-sm' : current > num ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
              >
                <Text className={`font-bold text-lg ${current === num ? 'text-white' : current > num ? 'text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>{num}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

function VideoRow({ video, onEdit, onDelete, theme, onProgressUpdate }: { video: VideoType, onEdit: (v: VideoType) => void, onDelete: (id: string) => void, theme: any, onProgressUpdate: (id: string, val: number) => void }) {
    const completed = video.completedVideos || 0;
    const isCompleted = completed === video.totalVideos && video.totalVideos > 0;
    const progress = video.totalVideos > 0 ? (completed / video.totalVideos) * 100 : 0;
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isQuickSelectOpen, setIsQuickSelectOpen] = useState(false);

    const handleIncrement = () => {
        if (completed < video.totalVideos) {
            onProgressUpdate(video.id, completed + 1);
        }
    };

    return (
      <View className="bg-white/80 dark:bg-slate-800/80 rounded-2xl p-3 mb-2 shadow-sm border border-slate-100 dark:border-slate-700">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            <View className={`w-10 h-10 rounded-xl items-center justify-center ${isCompleted ? 'bg-emerald-100' : 'bg-slate-100 dark:bg-slate-700'}`}>
              {isCompleted ? <CheckCircle size={20} color="#10b981" /> : <PlayCircle size={20} color="#64748b" />}
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800 dark:text-slate-100 text-[15px]" numberOfLines={1}>{video.title}</Text>
              {video.assigneeId && (
                <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>Atanan kişi var</Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)} className="p-2">
            <MoreVertical size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => setIsQuickSelectOpen(true)} className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 flex-row items-center gap-3 border border-slate-100 dark:border-slate-700">
            <View className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.barBg }}>
              <View className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: isCompleted ? '#10b981' : theme.bar }} />
            </View>
            <Text className={`font-mono font-bold text-sm ${isCompleted ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
              {completed} <Text className="text-[10px] text-slate-400 font-normal">/ {video.totalVideos}</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleIncrement}
            disabled={isCompleted}
            className={`w-10 h-10 rounded-xl items-center justify-center border ${isCompleted ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 dark:border-emerald-800' : 'border-rose-200 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-800'}`}
          >
            <Text className={`font-bold text-xl ${isCompleted ? 'text-emerald-500' : 'text-rose-500'}`}>+</Text>
          </TouchableOpacity>
        </View>

        <QuickSelectModal 
          visible={isQuickSelectOpen} 
          total={video.totalVideos} 
          current={completed} 
          onClose={() => setIsQuickSelectOpen(false)} 
          onSelect={(val) => {
            onProgressUpdate(video.id, val);
            setIsQuickSelectOpen(false);
          }} 
        />

        {/* Options Modal */}
        <Modal visible={isMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMenuOpen(false)}>
          <Pressable className="flex-1 bg-black/50 justify-center items-center" onPress={() => setIsMenuOpen(false)}>
            <View className="bg-white dark:bg-slate-900 w-64 rounded-3xl overflow-hidden shadow-2xl">
              <TouchableOpacity onPress={() => { setIsMenuOpen(false); onEdit(video); }} className="flex-row items-center p-4 border-b border-slate-100 dark:border-slate-800">
                <Edit size={20} color="#3b82f6" />
                <Text className="ml-3 font-semibold text-slate-700 dark:text-slate-200 text-base">Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setIsMenuOpen(false);
                Alert.alert("Listeyi Sil", `"${video.title}" silinsin mi?`, [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => onDelete(video.id) }
                ]);
              }} className="flex-row items-center p-4">
                <Trash2 size={20} color="#ef4444" />
                <Text className="ml-3 font-semibold text-rose-500 text-base">Listeyi Sil</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
}

function CollapsibleShelf({ name, videos, colorIndex, onEdit, onDelete, onProgressUpdate }: { name: string, videos: VideoType[], colorIndex: number, onEdit: (v: VideoType) => void, onDelete: (id: string) => void, onProgressUpdate: (id: string, val: number) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const theme = shelfColors[colorIndex % shelfColors.length];

    const totalVids = videos.reduce((acc, v) => acc + v.totalVideos, 0);
    const completedVids = videos.reduce((acc, v) => acc + (v.completedVideos || 0), 0);
    const shelfProgress = totalVids > 0 ? Math.round((completedVids / totalVids) * 100) : 0;
    const isAllDone = shelfProgress === 100 && totalVids > 0;

    return (
      <View className="mb-4 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
        <LinearGradient colors={[theme.start, theme.end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity onPress={() => setIsOpen(!isOpen)} className="p-4" activeOpacity={0.8}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
                  <ChevronDown size={20} color={theme.subtext} />
                </View>
                <FolderOpen size={24} color={isAllDone ? '#10b981' : theme.bar} />
                <View className="flex-1">
                  <Text className="text-lg font-bold" style={{ color: theme.text }}>{name}</Text>
                  <Text className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: theme.subtext }}>
                    {videos.length} Dosya • {totalVids} Video
                  </Text>
                </View>
              </View>
              <Text className="text-base font-mono font-bold" style={{ color: isAllDone ? '#10b981' : theme.bar }}>%{shelfProgress}</Text>
            </View>
            <View className="flex-row items-center gap-3 mt-4">
              <View className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.barBg }}>
                <View className="h-full rounded-full" style={{ width: `${shelfProgress}%`, backgroundColor: isAllDone ? '#10b981' : theme.bar }} />
              </View>
              <Text className="text-xs font-bold" style={{ color: theme.subtext }}>{completedVids} / {totalVids}</Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {isOpen && (
          <View className="p-3 bg-slate-50/50 dark:bg-slate-900/50">
            {videos.map(video => (
              <VideoRow key={video.id} video={video} theme={theme} onEdit={onEdit} onDelete={onDelete} onProgressUpdate={onProgressUpdate} />
            ))}
          </View>
        )}
      </View>
    );
}

export default function VideosScreen() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { familyMembers, familyId } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Auto-select first member
  useEffect(() => {
    if (familyMembers.length > 0 && !selectedMemberId) {
      setSelectedMemberId(familyMembers[0].id);
    }
  }, [familyMembers, selectedMemberId]);

  useEffect(() => {
    let unsubscribe: any;
    try {
      unsubscribe = onVideosUpdate((data: VideoType[]) => {
        setVideos(data);
        setLoading(false);
      });
    } catch (e) {
      setLoading(false);
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSaveVideo = async (data: NewVideoData) => {
    try {
      if (editingVideo) {
        await updateVideo(editingVideo.id, data);
      } else {
        await addVideo({
          ...data,
          completedVideos: 0,
        });
      }
      setIsFormOpen(false);
      setEditingVideo(null);
    } catch (e) {
      Alert.alert("Hata", "Video kaydedilirken bir sorun oluştu.");
    }
  };

  const handleUpdateProgress = async (id: string, val: number) => {
    await updateVideo(id, { completedVideos: val });
  };

  const filteredVideos = useMemo(() => {
    return videos.filter(v => v.assigneeId === selectedMemberId);
  }, [videos, selectedMemberId]);

  const shelves = useMemo(() => {
    const grouped: Record<string, VideoType[]> = {};
    filteredVideos.forEach(video => {
      const videoTags = video.tags && video.tags.length > 0 ? video.tags : ["Genel"];
      videoTags.forEach(tag => {
        if (!grouped[tag]) grouped[tag] = [];
        if (!grouped[tag].some(b => b.id === video.id)) {
            grouped[tag].push(video);
        }
      });
    });
    return grouped;
  }, [videos]);

  const sortedTags = useMemo(() => {
    return Object.keys(shelves).sort((a, b) => {
        if (a === "Genel") return 1;
        if (b === "Genel") return -1;
        return a.localeCompare(b);
    });
  }, [shelves]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#06b6d4" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Video Dersler</Text>
        <TouchableOpacity onPress={() => { setEditingVideo(null); setIsFormOpen(true); }} className="bg-rose-500 w-10 h-10 rounded-full items-center justify-center shadow-sm">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Member Selector */}
      {familyMembers.length > 0 && (
        <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 py-3 gap-3">
            {familyMembers.map((member) => {
              const isSelected = selectedMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => setSelectedMemberId(member.id)}
                  className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full border ${isSelected ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 dark:border-rose-800' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'}`}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: member.color || '#64748b', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{member.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text className={`font-semibold text-sm ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
         {filteredVideos.length === 0 ? (
           <View className="items-center justify-center mt-20">
             <View className="w-24 h-24 bg-rose-50 dark:bg-rose-900/30 rounded-full items-center justify-center mb-6 border border-rose-100 dark:border-rose-800">
                <PlayCircle size={48} color="#f43f5e" />
             </View>
             <Text className="text-slate-800 dark:text-white text-xl font-bold mb-2">Henüz Eğitim Yok</Text>
             <Text className="text-slate-500 text-sm font-medium text-center px-4">Sağ üstteki + butonuna basarak izleme listenize yeni video eğitimleri ekleyebilirsiniz.</Text>
           </View>
         ) : (
            sortedTags.map((tag, i) => (
              <CollapsibleShelf 
                key={tag} 
                name={tag} 
                videos={shelves[tag]} 
                colorIndex={i} 
                onEdit={(v) => { setEditingVideo(v); setIsFormOpen(true); }} 
                onDelete={deleteVideo} 
                onProgressUpdate={handleUpdateProgress}
              />
            ))
         )}
         <View className="h-10"></View>
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={isFormOpen} animationType="slide" onRequestClose={() => setIsFormOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} className="flex-1 bg-white dark:bg-slate-950">
          <View className="p-4 border-b border-slate-200 dark:border-slate-800 flex-row justify-between items-center mt-8">
            <Text className="text-xl font-bold text-slate-900 dark:text-white ml-2">{editingVideo ? 'Eğitimi Düzenle' : 'Yeni Eğitim Ekle'}</Text>
            <TouchableOpacity onPress={() => setIsFormOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
               <Text className="font-bold text-slate-500 dark:text-slate-400">Kapat</Text>
            </TouchableOpacity>
          </View>
          <NewVideoForm 
            initialData={editingVideo ? { ...editingVideo, tags: editingVideo.tags || [] } : undefined} 
            familyMembers={familyMembers} 
            onSubmit={handleSaveVideo} 
            onCancel={() => setIsFormOpen(false)} 
            submitLabel={editingVideo ? 'Güncelle' : 'Ekle'}
          />
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
