import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, StyleSheet, Dimensions, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Star, Plus, Minus, ShoppingBag, History, X, Settings, ChevronRight, Gift, Trash2, Edit3, RotateCcw, Target, Printer, ArrowUp, ArrowDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/auth-context';
import {
  addBehaviorRecord,
  onBehaviorRecordsUpdate,
  onRewardSettingsUpdate,
  saveFamilyRewardSettings,
  awardSticker,
  awardBigReward,
  removeSticker,
  addOrUpdateBehaviorOption,
  deleteBehaviorOption,
  saveMemberRewardTarget,
} from '../lib/dataService';
import {
  DEFAULT_POSITIVE_BEHAVIORS, DEFAULT_NEGATIVE_BEHAVIORS,
  getLevelInfo, FamilyMember, BehaviorRecord, FamilyRewardSettings, DEFAULT_REWARD_SETTINGS, BehaviorOption, MemberRewardTarget
} from '../lib/data';
import { printOrShareRewardChart } from '../lib/printRewardChart';

const { width } = Dimensions.get('window');

const MEMBER_GRADIENTS: [string, string][] = [
  ['#FF6B6B', '#FF8E53'],
  ['#4ECDC4', '#44A08D'],
  ['#A18CD1', '#FBC2EB'],
  ['#FDB99B', '#FE9496'],
  ['#43CBFF', '#9708CC'],
  ['#F093FB', '#F5576C'],
];

// Animasyonlu yıldız çubuğu
function StarProgressBar({ value, max }: { value: number; max: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, max > 0 ? value / max : 0),
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, max]);
  const widthInterp = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', width: widthInterp, backgroundColor: 'white', borderRadius: 6, opacity: 0.9 }} />
    </View>
  );
}

// Etiket göstergesi
function StickerRow({ count, max, emoji }: { count: number; max: number; emoji: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View key={i} style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: i < count ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: i < count ? 0 : 1.5,
          borderColor: 'rgba(255,255,255,0.4)',
        }}>
          <Text style={{ fontSize: i < count ? 18 : 14, opacity: i < count ? 1 : 0.4 }}>{emoji}</Text>
        </View>
      ))}
    </View>
  );
}

export default function RewardsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyId, familyMembers, user } = useAuth();

  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [settings, setSettings] = useState<FamilyRewardSettings>({ familyId: familyId || '', ...DEFAULT_REWARD_SETTINGS });

  // Behavior Modal
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [behaviorType, setBehaviorType] = useState<'positive' | 'negative'>('positive');
  const [customTitle, setCustomTitle] = useState('');
  const [customStars, setCustomStars] = useState('1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings Modal
  const [showSettings, setShowSettings] = useState(false);
  const [editStarsPerSticker, setEditStarsPerSticker] = useState('10');
  const [editStickersPerBigReward, setEditStickersPerBigReward] = useState('10');
  const [editBigRewardTitle, setEditBigRewardTitle] = useState('Büyük Ödül');
  const [editBigRewardEmoji, setEditBigRewardEmoji] = useState('🎁');
  const [editStickerEmoji, setEditStickerEmoji] = useState('🌟');

  // Manage Preset Behaviors Modal
  const [showManageBehaviors, setShowManageBehaviors] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetEmoji, setNewPresetEmoji] = useState('⭐');
  const [newPresetStars, setNewPresetStars] = useState('2');
  const [newPresetType, setNewPresetType] = useState<'positive' | 'negative'>('positive');

  // Member Specific Target Modal
  const [showMemberTargetModal, setShowMemberTargetModal] = useState(false);
  const [targetMember, setTargetMember] = useState<FamilyMember | null>(null);
  const [targetTitle, setTargetTitle] = useState('');
  const [targetEmoji, setTargetEmoji] = useState('🎁');
  const [targetStickers, setTargetStickers] = useState('10');

  // Only children
  const childMembers = useMemo(() =>
    (familyMembers || []).filter(m => m.role === 'Kız Çocuk' || m.role === 'Erkek Çocuk'),
    [familyMembers]
  );

  useEffect(() => {
    if (!familyId) return;
    const u1 = onBehaviorRecordsUpdate(familyId, setBehaviorRecords);
    const u2 = onRewardSettingsUpdate(familyId, (s) => {
      setSettings(s);
      setEditStarsPerSticker(String(s.starsPerSticker));
      setEditStickersPerBigReward(String(s.stickersPerBigReward));
      setEditBigRewardTitle(s.bigRewardTitle);
      setEditBigRewardEmoji(s.bigRewardEmoji);
      setEditStickerEmoji(s.stickerEmoji);
    });
    return () => { u1(); u2(); };
  }, [familyId]);

  // Current active preset behaviors (custom or default fallback)
  const activePresetBehaviors = useMemo(() => {
    if (settings.customBehaviors && settings.customBehaviors.length > 0) {
      return settings.customBehaviors.filter(b => b.type === behaviorType);
    }
    const defaults = behaviorType === 'positive' ? DEFAULT_POSITIVE_BEHAVIORS : DEFAULT_NEGATIVE_BEHAVIORS;
    return defaults.map((b, i) => ({ id: `${behaviorType}_${i}`, ...b, type: behaviorType }));
  }, [settings.customBehaviors, behaviorType]);

  const allPresets = useMemo(() => {
    if (settings.customBehaviors && settings.customBehaviors.length > 0) {
      return settings.customBehaviors;
    }
    return [
      ...DEFAULT_POSITIVE_BEHAVIORS.map((b, i) => ({ id: `pos_${i}`, ...b, type: 'positive' as const })),
      ...DEFAULT_NEGATIVE_BEHAVIORS.map((b, i) => ({ id: `neg_${i}`, ...b, type: 'negative' as const })),
    ];
  }, [settings.customBehaviors]);

  const openBehaviorModal = (member: FamilyMember, type: 'positive' | 'negative') => {
    setSelectedMember(member);
    setBehaviorType(type);
    setCustomTitle(''); setCustomStars('1'); setNote('');
    setShowBehaviorModal(true);
  };

  const openMemberTargetModal = (member: FamilyMember) => {
    setTargetMember(member);
    const target = settings.memberTargets?.[member.id];
    setTargetTitle(target?.bigRewardTitle || settings.bigRewardTitle);
    setTargetEmoji(target?.bigRewardEmoji || settings.bigRewardEmoji);
    setTargetStickers(String(target?.stickersPerBigReward || settings.stickersPerBigReward));
    setShowMemberTargetModal(true);
  };

  const handleSaveMemberTarget = async () => {
    if (!familyId || !targetMember) return;
    const count = parseInt(targetStickers) || settings.stickersPerBigReward;
    await saveMemberRewardTarget(familyId, targetMember.id, {
      bigRewardTitle: targetTitle.trim() || settings.bigRewardTitle,
      bigRewardEmoji: targetEmoji.trim() || settings.bigRewardEmoji,
      stickersPerBigReward: Math.max(1, count),
    });
    setShowMemberTargetModal(false);
    Alert.alert('✅ Kaydedildi', `${targetMember.name} için kişisel ödül hedefi belirlendi!`);
  };

  const handleAddBehavior = async (title: string, stars: number) => {
    if (!familyId || !selectedMember) {
      Alert.alert('Hata', 'Aile veya çocuk bilgisi bulunamadı.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        type: behaviorType,
        title,
        stars,
        createdBy: user?.displayName || user?.email || 'Ebeveyn',
        memberName: selectedMember.name,
      };
      if (note.trim()) payload.note = note.trim();
      await addBehaviorRecord(familyId, selectedMember.id, payload);
      setShowBehaviorModal(false);
    } catch (err: any) {
      console.error('Error adding behavior:', err);
      Alert.alert('Hata', err?.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleAwardSticker = async (member: FamilyMember, deductStars: boolean = true) => {
    if (!familyId) return;
    const starBalance = member.starBalance ?? 0;
    const needed = Number(settings.starsPerSticker) || 10;
    if (deductStars && starBalance < needed) {
      Alert.alert('Yetersiz Yıldız ⭐', `${member.name} için ${needed} yıldız gerekiyor.\nMevcut: ${starBalance} ⭐`);
      return;
    }
    const titleText = deductStars ? '🌟 Yıldız İle Etiket Ver' : '🌟 Doğrudan Etiket Ekle';
    const msgText = deductStars 
      ? `${member.name} için ${needed} yıldız harcanarak 1 ${settings.stickerEmoji} etiket verilecek.`
      : `${member.name} kullanıcısına yıldız harcamadan 1 ${settings.stickerEmoji} etiket eklenecek.`;

    Alert.alert(
      titleText,
      `${msgText}\n\nFiziksel etiketi de vermeyi unutmayın!`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Etiket Ver!',
          onPress: async () => {
            try {
              await awardSticker(familyId, member.id, member.name, needed, 1, user?.displayName || user?.email || 'Ebeveyn', undefined, deductStars);
              Alert.alert('🎉 Etiket Verildi!', `${member.name} ${settings.stickerEmoji} etiketi kazandı!`);
            } catch (err: any) {
              console.error('awardSticker error:', err);
              Alert.alert('Hata', err?.message || 'İşlem başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const handlePrintChart = async (member: FamilyMember) => {
    try {
      await printOrShareRewardChart(member, settings, allPresets);
    } catch (err: any) {
      console.error('Error printing chart:', err);
      Alert.alert('Hata', err?.message || 'Yazdırılabilir çizelge oluşturulurken bir hata oluştu.');
    }
  };

  const handleAwardBigReward = async (member: FamilyMember) => {
    if (!familyId) return;
    const target = settings.memberTargets?.[member.id];
    const memberBigRewardTitle = target?.bigRewardTitle || settings.bigRewardTitle;
    const memberBigRewardEmoji = target?.bigRewardEmoji || settings.bigRewardEmoji;
    const needed = Number(target?.stickersPerBigReward) || Number(settings.stickersPerBigReward) || 10;

    const stickerBalance = member.stickerBalance ?? 0;
    if (stickerBalance < needed) {
      Alert.alert('Yetersiz Etiket', `${member.name} için ${needed} etiket gerekiyor.\nMevcut: ${stickerBalance} ${settings.stickerEmoji}`);
      return;
    }
    Alert.alert(
      `${memberBigRewardEmoji} Büyük Ödül`,
      `${member.name} ${needed} etiket biriktirdi!\n"${memberBigRewardTitle}" ödülünü kazandı!`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: '🎁 Ödülü Ver!',
          onPress: async () => {
            try {
              await awardBigReward(familyId, member.id, member.name, needed, user?.displayName || user?.email || 'Ebeveyn', memberBigRewardTitle);
              Alert.alert(`${memberBigRewardEmoji} TEBRİKLER!`, `${member.name} büyük ödülünü kazandı!\n"${memberBigRewardTitle}" verildi!`);
            } catch (err: any) {
              console.error('awardBigReward error:', err);
              Alert.alert('Hata', err?.message || 'İşlem başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const handleRemoveSticker = async (member: FamilyMember) => {
    if (!familyId) return;
    if ((member.stickerBalance ?? 0) <= 0) { Alert.alert('Etiket yok', `${member.name}'nin etiket bakiyesi zaten 0.`); return; }
    Alert.alert('Etiket Geri Al', `${member.name}'den 1 etiket geri alınacak. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Geri Al', style: 'destructive', onPress: async () => { await removeSticker(familyId, member.id, member.name, 1, user?.displayName || user?.email || 'Ebeveyn'); } }
    ]);
  };

  const handleSaveSettings = async () => {
    if (!familyId) return;
    const s = parseInt(editStarsPerSticker);
    const b = parseInt(editStickersPerBigReward);
    if (!s || !b || s < 1 || b < 1) { Alert.alert('Hata', 'Lütfen geçerli sayılar girin (minimum 1).'); return; }
    await saveFamilyRewardSettings(familyId, {
      starsPerSticker: s,
      stickersPerBigReward: b,
      bigRewardTitle: editBigRewardTitle.trim() || 'Büyük Ödül',
      bigRewardEmoji: editBigRewardEmoji.trim() || '🎁',
      stickerEmoji: editStickerEmoji.trim() || '🌟',
    });
    setShowSettings(false);
    Alert.alert('✅ Kaydedildi', 'Ayarlar güncellendi!');
  };

  // Manage Presets
  const handleAddNewPreset = async () => {
    if (!familyId || !newPresetTitle.trim()) return;
    const newOpt: BehaviorOption = {
      id: editingPresetId || `custom_${Date.now()}`,
      title: newPresetTitle.trim(),
      emoji: newPresetEmoji.trim() || (newPresetType === 'positive' ? '⭐' : '😤'),
      stars: Math.max(1, parseInt(newPresetStars) || 1),
      type: newPresetType,
    };
    await addOrUpdateBehaviorOption(familyId, newOpt);
    const wasEditing = !!editingPresetId;
    setEditingPresetId(null);
    setNewPresetTitle(''); setNewPresetEmoji('⭐'); setNewPresetStars('2');
    Alert.alert('✅ Kaydedildi', wasEditing ? `"${newOpt.title}" güncellendi!` : `"${newOpt.title}" hazır davranışlara eklendi!`);
  };

  const handleEditPreset = (b: BehaviorOption) => {
    setEditingPresetId(b.id);
    setNewPresetTitle(b.title);
    setNewPresetEmoji(b.emoji);
    setNewPresetStars(String(b.stars));
    setNewPresetType(b.type);
  };

  const handleCancelEditPreset = () => {
    setEditingPresetId(null);
    setNewPresetTitle(''); setNewPresetEmoji('⭐'); setNewPresetStars('2');
  };

  const handleDeletePreset = async (id: string, title: string) => {
    if (!familyId) return;
    Alert.alert('Davranışı Sil', `"${title}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteBehaviorOption(familyId, id); } }
    ]);
  };

  const handleResetPresetsToDefault = async () => {
    if (!familyId) return;
    Alert.alert('Varsayılana Sıfırla', 'Hazır davranış listesi varsayılan listeye sıfırlansın mı?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sıfırla', style: 'destructive', onPress: async () => {
          const defaults = [
            ...DEFAULT_POSITIVE_BEHAVIORS.map((b, i) => ({ id: `pos_${i}`, ...b, type: 'positive' as const })),
            ...DEFAULT_NEGATIVE_BEHAVIORS.map((b, i) => ({ id: `neg_${i}`, ...b, type: 'negative' as const })),
          ];
          await saveFamilyRewardSettings(familyId, { customBehaviors: defaults });
          Alert.alert('Sıfırlandı', 'Hazır davranışlar varsayılana döndürüldü.');
        }
      }
    ]);
  };

  const handleReorderPreset = async (index: number, direction: 'up' | 'down') => {
    if (!familyId) return;
    const newPresets = [...allPresets];
    if (direction === 'up' && index > 0) {
      const temp = newPresets[index - 1];
      newPresets[index - 1] = newPresets[index];
      newPresets[index] = temp;
    } else if (direction === 'down' && index < newPresets.length - 1) {
      const temp = newPresets[index + 1];
      newPresets[index + 1] = newPresets[index];
      newPresets[index] = temp;
    } else {
      return;
    }
    await saveFamilyRewardSettings(familyId, { customBehaviors: newPresets });
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A1A' : '#F0F4FF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={isDark ? ['#1A0A2E', '#0D1B2A', '#0A1628'] : ['#E8D5FF', '#D5E8FF', '#D5FFE8']}
          style={{ flex: 1 }}
        />
      </View>

      {/* Header */}
      <View style={{ backgroundColor: isDark ? 'rgba(20,10,40,0.85)' : 'rgba(255,255,255,0.7)', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)' }}>
        <SafeAreaView edges={['top']} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
            <ChevronLeft size={28} color="#A259FF" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#F0E6FF' : '#2D1B69' }}>⭐ Davranış & Ödüller</Text>
            <Text style={{ fontSize: 10, color: isDark ? '#9B7EC8' : '#7B5CB8', fontWeight: '600' }}>
              {settings.starsPerSticker}⭐ → {settings.stickerEmoji} → {settings.stickersPerBigReward}{settings.stickerEmoji} → {settings.bigRewardEmoji}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(162,89,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={20} color="#A259FF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Quick Links */}
        <View style={{ gap: 8, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/reward-market')}
              style={{ flex: 1, padding: 11, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: isDark ? 'rgba(162,89,255,0.18)' : 'rgba(162,89,255,0.1)', borderWidth: 1, borderColor: 'rgba(162,89,255,0.25)' }}
            >
              <ShoppingBag size={15} color="#A259FF" />
              <Text style={{ color: '#A259FF', fontWeight: '700', fontSize: 12 }}>Ödül Marketi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowManageBehaviors(true)}
              style={{ flex: 1, padding: 11, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: isDark ? 'rgba(78,205,196,0.18)' : 'rgba(78,205,196,0.1)', borderWidth: 1, borderColor: 'rgba(78,205,196,0.3)' }}
            >
              <Edit3 size={15} color="#4ECDC4" />
              <Text style={{ color: '#4ECDC4', fontWeight: '700', fontSize: 12 }}>Hazır Davranışlar</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/behavior-history')}
              style={{ flex: 1, padding: 11, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: isDark ? 'rgba(255,149,0,0.18)' : 'rgba(255,149,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,149,0,0.25)' }}
            >
              <History size={15} color="#FF9500" />
              <Text style={{ color: '#FF9500', fontWeight: '700', fontSize: 12 }}>Geçmiş</Text>
            </TouchableOpacity>

            {childMembers.length > 0 && (
              <TouchableOpacity
                onPress={() => handlePrintChart(childMembers[0])}
                style={{ flex: 1, padding: 11, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: isDark ? 'rgba(0,200,83,0.18)' : 'rgba(0,200,83,0.1)', borderWidth: 1, borderColor: 'rgba(0,200,83,0.3)' }}
              >
                <Printer size={15} color="#00C853" />
                <Text style={{ color: '#00C853', fontWeight: '700', fontSize: 12 }}>Çizelge Yazdır (PDF)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Child Cards */}
        {childMembers.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🧒</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#E0D0FF' : '#2D1B69', marginBottom: 8 }}>Henüz çocuk eklenmemiş</Text>
            <Text style={{ fontSize: 13, color: isDark ? '#9B7EC8' : '#7B5CB8', textAlign: 'center', lineHeight: 20 }}>
              Aile üyeleri ekranından çocukları ekleyin.
            </Text>
          </View>
        ) : (
          childMembers.map((member, index) => {
            const starBalance = member.starBalance ?? 0;
            const totalStars = member.totalStarsEarned ?? 0;
            const stickerBalance = member.stickerBalance ?? 0;
            const totalBigRewards = member.totalBigRewardsEarned ?? 0;
            const levelInfo = getLevelInfo(totalStars);
            const gradient = MEMBER_GRADIENTS[index % MEMBER_GRADIENTS.length];

            const memberTarget = settings.memberTargets?.[member.id];
            const memberBigRewardTitle = memberTarget?.bigRewardTitle || settings.bigRewardTitle;
            const memberBigRewardEmoji = memberTarget?.bigRewardEmoji || settings.bigRewardEmoji;
            const memberStickersNeeded = memberTarget?.stickersPerBigReward || settings.stickersPerBigReward;

            const starProgress = starBalance % settings.starsPerSticker;
            const canEarnSticker = starBalance >= settings.starsPerSticker;
            const canEarnBigReward = stickerBalance >= memberStickersNeeded;

            return (
              <View key={member.id} style={{ marginBottom: 24, borderRadius: 28, overflow: 'hidden', elevation: 10 }}>
                <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>

                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }}>
                      <Text style={{ fontSize: 30 }}>{member.avatar || (member.role === 'Kız Çocuk' ? '👧' : '👦')}</Text>
                    </View>
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: 'white' }}>{member.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{levelInfo.emoji} {levelInfo.label}</Text>
                        </View>
                        {totalBigRewards > 0 && (
                          <View style={{ backgroundColor: 'rgba(255,220,0,0.4)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
                            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{memberBigRewardEmoji} ×{totalBigRewards}</Text>
                          </View>
                        )}
                      </View>

                      {/* Member Custom Target & Print Buttons */}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          onPress={() => openMemberTargetModal(member)}
                          style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Target size={12} color="white" />
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>
                            Hedef: {memberBigRewardEmoji} {memberBigRewardTitle} ({memberStickersNeeded} {settings.stickerEmoji})
                          </Text>
                          <Edit3 size={10} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handlePrintChart(member)}
                          style={{ backgroundColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                          <Printer size={12} color="white" />
                          <Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>🖨️ Yazdır / PDF</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Yıldız Bakiyesi */}
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 14, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: 'white' }}>⭐ Yıldız Bakiyesi</Text>
                      <Text style={{ fontSize: 28, fontWeight: '900', color: 'white' }}>{starBalance}</Text>
                    </View>
                    <View style={{ marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                          {settings.stickerEmoji} Etiket için: {starProgress}/{settings.starsPerSticker} ⭐
                        </Text>
                        {canEarnSticker && (
                          <View style={{ backgroundColor: '#FFE066', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#7B5000' }}>HAZIR!</Text>
                          </View>
                        )}
                      </View>
                      <StarProgressBar value={starProgress} max={settings.starsPerSticker} />
                    </View>
                    {canEarnSticker && (
                      <TouchableOpacity
                        onPress={() => handleAwardSticker(member)}
                        style={{ backgroundColor: '#FFE066', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 16 }}>{settings.stickerEmoji}</Text>
                        <Text style={{ color: '#7B5000', fontWeight: '900', fontSize: 13 }}>Etiket Ver ({settings.starsPerSticker} ⭐ harcar)</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Etiket Koleksiyonu */}
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, padding: 14, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: 'white' }}>{settings.stickerEmoji} Etiket Koleksiyonu</Text>
                      <Text style={{ fontSize: 22, fontWeight: '900', color: 'white' }}>{stickerBalance}</Text>
                    </View>
                    <StickerRow
                      count={Math.min(stickerBalance, memberStickersNeeded)}
                      max={Math.min(memberStickersNeeded, 20)}
                      emoji={settings.stickerEmoji}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: canEarnBigReward ? 10 : 0 }}>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                        {memberBigRewardEmoji} Büyük ödül için: {Math.min(stickerBalance, memberStickersNeeded)}/{memberStickersNeeded} {settings.stickerEmoji}
                      </Text>
                      {canEarnBigReward && (
                        <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: '#5D3A00' }}>KAZANDI!</Text>
                        </View>
                      )}
                    </View>
                    {canEarnBigReward && (
                      <TouchableOpacity
                        onPress={() => handleAwardBigReward(member)}
                        style={{ backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Text style={{ fontSize: 18 }}>{memberBigRewardEmoji}</Text>
                        <Text style={{ color: '#5D3A00', fontWeight: '900', fontSize: 13 }}>{memberBigRewardTitle} Hedefini Ver!</Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleAwardSticker(member, false)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}
                      >
                        <Plus size={12} color="white" />
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>Etiket Ekle (Yıldızsız)</Text>
                      </TouchableOpacity>
                      {stickerBalance > 0 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveSticker(member)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.7 }}
                        >
                          <Minus size={12} color="white" />
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>Etiket geri al</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* +/- Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => openBehaviorModal(member, 'positive')}
                      style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <Plus size={20} color="white" strokeWidth={3} />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Yıldız Ver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openBehaviorModal(member, 'negative')}
                      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                      <Minus size={20} color="rgba(255,255,255,0.9)" strokeWidth={3} />
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 14 }}>Yıldız Al</Text>
                    </TouchableOpacity>
                  </View>

                </LinearGradient>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ─── BEHAVIOR MODAL ─── */}
      <Modal visible={showBehaviorModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }} edges={['top']}>
          <View style={{ flex: 1, padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F0E6FF' : '#2D1B69' }}>
                  {behaviorType === 'positive' ? '⭐ Yıldız Ver' : '📉 Yıldız Al'}
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginTop: 2 }}>
                  {selectedMember?.name} için davranış seç
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBehaviorModal(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F5', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={isDark ? '#9B7EC8' : '#7B5CB8'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1 }}>HAZIR DAVRANIŞLAR</Text>
                <TouchableOpacity onPress={() => { setShowBehaviorModal(false); setShowManageBehaviors(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Edit3 size={12} color="#A259FF" />
                  <Text style={{ fontSize: 11, color: '#A259FF', fontWeight: '700' }}>Listeyi Düzenle</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {activePresetBehaviors.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => handleAddBehavior(b.title, b.stars)}
                    disabled={saving}
                    style={{
                      backgroundColor: behaviorType === 'positive' ? 'rgba(0,200,83,0.1)' : 'rgba(255,61,0,0.09)',
                      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      borderWidth: 1, borderColor: behaviorType === 'positive' ? 'rgba(0,200,83,0.25)' : 'rgba(255,61,0,0.2)'
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{b.emoji}</Text>
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#E0D0FF' : '#2D1B69' }}>{b.title}</Text>
                      <Text style={{ fontSize: 10, color: behaviorType === 'positive' ? '#00C853' : '#FF3D00', fontWeight: '700' }}>
                        {behaviorType === 'positive' ? '+' : '-'}{b.stars} ⭐
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 10 }}>ÖZEL EKLE</Text>
              <TextInput
                placeholder="Davranış açıklaması..."
                placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'}
                value={customTitle} onChangeText={setCustomTitle}
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <TextInput
                  placeholder="Yıldız sayısı"
                  placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'}
                  value={customStars} onChangeText={setCustomStars} keyboardType="number-pad"
                  style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 14, borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
                <TouchableOpacity
                  onPress={() => { if (!customTitle.trim()) return; handleAddBehavior(customTitle, Math.max(1, Math.min(20, parseInt(customStars) || 1))); }}
                  disabled={saving || !customTitle.trim()}
                  style={{ backgroundColor: '#A259FF', borderRadius: 14, paddingHorizontal: 20, height: 48, alignItems: 'center', justifyContent: 'center', opacity: customTitle.trim() ? 1 : 0.4 }}
                >
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Ekle</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder="Not (isteğe bağlı)..."
                placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'}
                value={note} onChangeText={setNote}
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 14, borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── MANAGE PRESET BEHAVIORS MODAL ─── */}
      <Modal visible={showManageBehaviors} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }} edges={['top']}>
          <View style={{ flex: 1, padding: 24 }}>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F0E6FF' : '#2D1B69' }}>✏️ Hazır Davranışları Yönet</Text>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginTop: 2 }}>
                  Sık kullanılan davranışları ekleyin veya silin
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowManageBehaviors(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F5', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={isDark ? '#9B7EC8' : '#7B5CB8'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

              {/* Add New / Edit Preset Form */}
              <View style={{ backgroundColor: isDark ? 'rgba(162,89,255,0.1)' : 'rgba(162,89,255,0.06)', borderRadius: 18, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#A259FF' }}>
                    {editingPresetId ? '✏️ HAZIR DAVRANIŞI DÜZENLE' : '➕ YENİ HAZIR DAVRANIŞ EKLE'}
                  </Text>
                  {editingPresetId && (
                    <TouchableOpacity onPress={handleCancelEditPreset}>
                      <Text style={{ fontSize: 11, color: '#FF6B6B', fontWeight: '700' }}>İptal</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Type selector */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity
                    onPress={() => setNewPresetType('positive')}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: newPresetType === 'positive' ? '#00C853' : (isDark ? 'rgba(255,255,255,0.07)' : '#E0E0E0') }}
                  >
                    <Text style={{ color: newPresetType === 'positive' ? 'white' : (isDark ? '#AAA' : '#555'), fontWeight: '700', fontSize: 12 }}>+ Olumlu ⭐</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setNewPresetType('negative')}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: newPresetType === 'negative' ? '#FF3D00' : (isDark ? 'rgba(255,255,255,0.07)' : '#E0E0E0') }}
                  >
                    <Text style={{ color: newPresetType === 'negative' ? 'white' : (isDark ? '#AAA' : '#555'), fontWeight: '700', fontSize: 12 }}>- Olumsuz 📉</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder="Başlık (örn: Diş fırçalama, Kitap okuma)"
                  placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'}
                  value={newPresetTitle} onChangeText={setNewPresetTitle}
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, height: 42, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 13, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 3 }}>Emoji</Text>
                    <TextInput
                      value={newPresetEmoji} onChangeText={setNewPresetEmoji}
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF', borderRadius: 12, paddingHorizontal: 8, height: 42, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 20, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 3 }}>Yıldız Sayısı</Text>
                    <TextInput
                      value={newPresetStars} onChangeText={setNewPresetStars} keyboardType="number-pad"
                      style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF', borderRadius: 12, paddingHorizontal: 8, height: 42, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 15, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleAddNewPreset}
                  disabled={!newPresetTitle.trim()}
                  style={{ backgroundColor: editingPresetId ? '#4ECDC4' : '#A259FF', borderRadius: 12, height: 42, alignItems: 'center', justifyContent: 'center', opacity: newPresetTitle.trim() ? 1 : 0.4 }}
                >
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>
                    {editingPresetId ? 'Güncelle & Kaydet' : 'Listeye Ekle'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* List of Existing Presets */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1 }}>MEVCUT LISTE</Text>
                <TouchableOpacity onPress={handleResetPresetsToDefault} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <RotateCcw size={11} color="#FF6B6B" />
                  <Text style={{ fontSize: 10, color: '#FF6B6B', fontWeight: '700' }}>Varsayılana Dön</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 6, marginBottom: 20 }}>
                {allPresets.map((b, index) => (
                  <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F0FF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(162,89,255,0.15)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={{ alignItems: 'center', marginRight: 2 }}>
                        <TouchableOpacity onPress={() => handleReorderPreset(index, 'up')} disabled={index === 0} style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}>
                          <ArrowUp size={14} color={isDark ? '#9B7EC8' : '#7B5CB8'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleReorderPreset(index, 'down')} disabled={index === allPresets.length - 1} style={{ opacity: index === allPresets.length - 1 ? 0.3 : 1, padding: 4 }}>
                          <ArrowDown size={14} color={isDark ? '#9B7EC8' : '#7B5CB8'} />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ fontSize: 18 }}>{b.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#F0E6FF' : '#2D1B69' }}>{b.title}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: b.type === 'positive' ? '#00C853' : '#FF3D00' }}>
                          {b.type === 'positive' ? '+' : '-'}{b.stars} ⭐ ({b.type === 'positive' ? 'Olumlu' : 'Olumsuz'})
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <TouchableOpacity onPress={() => handleEditPreset(b)} style={{ padding: 6 }}>
                        <Edit3 size={16} color="#A259FF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeletePreset(b.id, b.title)} style={{ padding: 6 }}>
                        <Trash2 size={16} color="#FF4D4D" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── SETTINGS MODAL ─── */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowSettings(false)} />
          <View style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F0E6FF' : '#2D1B69' }}>⚙️ Sistem Ayarları</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><X size={22} color={isDark ? '#9B7EC8' : '#7B5CB8'} /></TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 8 }}>YILDIZ → ETİKET</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 6 }}>Kaç yıldız = 1 etiket</Text>
                <TextInput
                  value={editStarsPerSticker} onChangeText={setEditStarsPerSticker} keyboardType="number-pad"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 18, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 6 }}>Etiket emojisi</Text>
                <TextInput
                  value={editStickerEmoji} onChangeText={setEditStickerEmoji}
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 28, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
              </View>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 8 }}>ETİKET → BÜYÜK ÖDÜL</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 6 }}>Kaç etiket = büyük ödül</Text>
                <TextInput
                  value={editStickersPerBigReward} onChangeText={setEditStickersPerBigReward} keyboardType="number-pad"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 18, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 6 }}>Büyük ödül emojisi</Text>
                <TextInput
                  value={editBigRewardEmoji} onChangeText={setEditBigRewardEmoji}
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 28, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
              </View>
            </View>
            <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginBottom: 6 }}>Büyük ödül adı</Text>
            <TextInput
              value={editBigRewardTitle} onChangeText={setEditBigRewardTitle}
              placeholder="örn: Sinema Gecesi, Tatil, iPad"
              placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'}
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)', marginBottom: 20 }}
            />

            <TouchableOpacity onPress={handleSaveSettings} style={{ height: 52, backgroundColor: '#A259FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Ayarları Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MEMBER SPECIFIC REWARD TARGET MODAL ─── */}
      <Modal visible={showMemberTargetModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowMemberTargetModal(false)} />
          <View style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 }}>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F0E6FF' : '#2D1B69' }}>
                  🎯 Kişisel Ödül Hedefi
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginTop: 2 }}>
                  {targetMember?.name} için özel büyük ödül ve etiket sayısı
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMemberTargetModal(false)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F0F5', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={isDark ? '#9B7EC8' : '#7B5CB8'} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 6 }}>ÖDÜL ADI</Text>
            <TextInput
              value={targetTitle} onChangeText={setTargetTitle}
              placeholder="örn: Bisiklet, Paten, Akülü Araba, Sinema Biletleri"
              placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'}
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)', marginBottom: 14 }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 6 }}>EMOJİ</Text>
                <TextInput
                  value={targetEmoji} onChangeText={setTargetEmoji}
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 26, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 6 }}>GEREKLİ ETİKET</Text>
                <TextInput
                  value={targetStickers} onChangeText={setTargetStickers} keyboardType="number-pad"
                  style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#F0E6FF' : '#2D1B69', fontSize: 18, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(162,89,255,0.2)' }}
                />
              </View>
            </View>

            <TouchableOpacity onPress={handleSaveMemberTarget} style={{ height: 52, backgroundColor: '#A259FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Hedefi Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
