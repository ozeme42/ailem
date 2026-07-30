import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, X, Check, Clock, ShoppingBag, Plus, Trash2, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/auth-context';
import {
  onRewardItemsUpdate, onRewardClaimsUpdate,
  addRewardItem, deleteRewardItem,
  claimReward, approveRewardClaim, rejectRewardClaim
} from '../lib/dataService';
import { RewardItem, RewardClaim, FamilyMember } from '../lib/data';

const { width } = Dimensions.get('window');

const REWARD_COLORS = [
  ['#FF6B6B', '#FF8E53'],
  ['#4ECDC4', '#44A08D'],
  ['#A18CD1', '#FBC2EB'],
  ['#FDB99B', '#FE9496'],
  ['#43CBFF', '#9708CC'],
  ['#F093FB', '#F5576C'],
  ['#4FACFE', '#00F2FE'],
  ['#43E97B', '#38F9D7'],
];

const EMOJI_OPTIONS = ['🎬', '🎮', '🍕', '🍦', '🏖', '🎡', '🎁', '🛒', '🎢', '🍫', '🎪', '📱', '🎈', '🎠', '⚽', '🏊', '🚴', '🎨', '🎭', '🏆'];

export default function RewardMarketScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyId, familyMembers, user } = useAuth();

  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'manage' | 'pending'>('market');

  // New reward form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎁');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Claim modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [claimMember, setClaimMember] = useState<FamilyMember | null>(null);

  const childMembers = useMemo(() =>
    (familyMembers || []).filter(m => m.role === 'Kız Çocuk' || m.role === 'Erkek Çocuk'),
    [familyMembers]
  );

  const pendingClaims = useMemo(() => claims.filter(c => c.status === 'pending'), [claims]);

  useEffect(() => {
    if (!familyId) return;
    const u1 = onRewardItemsUpdate(familyId, setRewardItems);
    const u2 = onRewardClaimsUpdate(familyId, setClaims);
    return () => { u1(); u2(); };
  }, [familyId]);

  const handleAddReward = async () => {
    if (!newTitle.trim() || !newCost) { Alert.alert('Hata', 'Lütfen tüm alanları doldurun.'); return; }
    if (!familyId) return;
    setSaving(true);
    try {
      await addRewardItem({ familyId, title: newTitle.trim(), starCost: parseInt(newCost), emoji: newEmoji, description: newDesc.trim() || undefined, isActive: true });
      setShowAddModal(false);
      setNewTitle(''); setNewCost(''); setNewEmoji('🎁'); setNewDesc('');
      Alert.alert('✅ Ödül Eklendi!', `"${newTitle}" başarıyla markete eklendi.`);
    } catch { Alert.alert('Hata', 'Ödül eklenemedi.'); }
    finally { setSaving(false); }
  };

  const handleClaim = async () => {
    if (!selectedReward || !claimMember || !familyId) return;
    const balance = claimMember.starBalance ?? 0;
    if (balance < selectedReward.starCost) {
      Alert.alert('Yetersiz Yıldız ⭐', `${claimMember.name} için yeterli yıldız yok.\nGerekli: ${selectedReward.starCost} ⭐\nMevcut: ${balance} ⭐`);
      return;
    }
    setSaving(true);
    try {
      await claimReward(familyId, claimMember.id, claimMember.name, selectedReward);
      setShowClaimModal(false);
      Alert.alert('🎉 Talep Gönderildi!', `${claimMember.name} için "${selectedReward.title}" talebi ebeveyn onayına gönderildi!`);
    } catch { Alert.alert('Hata', 'Talep gönderilemedi.'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (claim: RewardClaim) => {
    if (!familyId || !user) return;
    try {
      await approveRewardClaim(familyId, claim.id, claim.memberId, claim.starCost, user.name || 'Ebeveyn');
      Alert.alert('✅ Onaylandı!', `${claim.memberName} için "${claim.rewardTitle}" ödülü verildi! ${claim.starCost} ⭐ bakiyeden düşüldü.`);
    } catch { Alert.alert('Hata', 'İşlem yapılamadı.'); }
  };

  const handleReject = async (claim: RewardClaim) => {
    if (!user) return;
    Alert.alert('Talebi Reddet', `${claim.memberName}'nin "${claim.rewardTitle}" talebini reddetmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Reddet', style: 'destructive', onPress: async () => { await rejectRewardClaim(claim.id, user.name || 'Ebeveyn'); } }
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A1A' : '#F0F4FF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={isDark ? ['#1A0A2E', '#0D1B2A'] : ['#FFF0E8', '#F0E8FF']} style={{ flex: 1 }} />
        <View style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,149,0,0.1)' }} />
        <View style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(162,89,255,0.1)' }} />
      </View>

      {/* Header */}
      <View style={{ backgroundColor: isDark ? 'rgba(20,10,40,0.85)' : 'rgba(255,255,255,0.7)', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)' }}>
        <SafeAreaView edges={['top']} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
            <ChevronLeft size={28} color="#FF9500" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#FFE0B2' : '#5D2E00' }}>🛒 Ödül Marketi</Text>
            <Text style={{ fontSize: 10, color: isDark ? '#FF9500' : '#FF6B00', fontWeight: '600' }}>Yıldızlarınla ödül kazan!</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,149,0,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={20} color="#FF9500" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
          {[
            { key: 'market', label: '🛍 Market' },
            { key: 'pending', label: `⏳ Bekleyenler ${pendingClaims.length > 0 ? `(${pendingClaims.length})` : ''}` },
            { key: 'manage', label: '⚙️ Yönet' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: activeTab === tab.key ? '#FF9500' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === tab.key ? 'white' : (isDark ? '#9B7EC8' : '#7B5CB8') }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <>
            {rewardItems.filter(r => r.isActive).length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 52, marginBottom: 16 }}>🎁</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFE0B2' : '#5D2E00', marginBottom: 8 }}>Market boş!</Text>
                <Text style={{ fontSize: 14, color: isDark ? '#FF9500' : '#FF6B00', textAlign: 'center', lineHeight: 20 }}>Sağ üstteki + butonuna basarak ödüller ekleyin.</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {rewardItems.filter(r => r.isActive).map((reward, index) => {
                  const grad = REWARD_COLORS[index % REWARD_COLORS.length] as [string, string];
                  return (
                    <TouchableOpacity
                      key={reward.id}
                      onPress={() => { setSelectedReward(reward); setClaimMember(childMembers[0] || null); setShowClaimModal(true); }}
                      style={{ width: (width - 44) / 2, borderRadius: 22, overflow: 'hidden', shadowColor: grad[0], shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}
                    >
                      <LinearGradient colors={grad} style={{ padding: 18, alignItems: 'center', minHeight: 150 }}>
                        <Text style={{ fontSize: 44, marginBottom: 10 }}>{reward.emoji}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 8 }}>{reward.title}</Text>
                        {reward.description ? <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8 }}>{reward.description}</Text> : null}
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Star size={14} color="#FFE066" fill="#FFE066" />
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>{reward.starCost}</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* PENDING CLAIMS TAB */}
        {activeTab === 'pending' && (
          <>
            {pendingClaims.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 52, marginBottom: 16 }}>🎉</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFE0B2' : '#5D2E00', marginBottom: 8 }}>Bekleyen talep yok!</Text>
                <Text style={{ fontSize: 14, color: isDark ? '#FF9500' : '#FF6B00', textAlign: 'center' }}>Tüm talepler işlendi.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {pendingClaims.map(claim => (
                  <View key={claim.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.3)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 32, marginRight: 12 }}>{claim.rewardEmoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#FFE0B2' : '#5D2E00' }}>{claim.rewardTitle}</Text>
                        <Text style={{ fontSize: 12, color: isDark ? '#FF9500' : '#FF6B00', marginTop: 2 }}>
                          {claim.memberName} • {claim.starCost} ⭐ gerekiyor
                        </Text>
                        <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8', marginTop: 2 }}>
                          {new Date(claim.claimedAt).toLocaleDateString('tr-TR')} tarihinde talep edildi
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleReject(claim)}
                        style={{ flex: 1, height: 40, backgroundColor: 'rgba(255,61,0,0.12)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: 'rgba(255,61,0,0.25)' }}
                      >
                        <X size={16} color="#FF3D00" />
                        <Text style={{ color: '#FF3D00', fontWeight: '700', fontSize: 13 }}>Reddet</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleApprove(claim)}
                        style={{ flex: 2, height: 40, backgroundColor: '#00C853', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                      >
                        <Check size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Onayla & Ödülü Ver</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* MANAGE TAB */}
        {activeTab === 'manage' && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{ height: 52, backgroundColor: '#FF9500', borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 }}
            >
              <Plus size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>Yeni Ödül Ekle</Text>
            </TouchableOpacity>
            {rewardItems.map((reward, index) => (
              <View key={reward.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }}>
                <Text style={{ fontSize: 28, marginRight: 12 }}>{reward.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFE0B2' : '#5D2E00' }}>{reward.title}</Text>
                  <Text style={{ fontSize: 12, color: '#FF9500', fontWeight: '600' }}>{reward.starCost} ⭐ gerekiyor</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Ödülü Sil', `"${reward.title}" silinsin mi?`, [{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => deleteRewardItem(reward.id) }])}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,61,0,0.1)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 size={16} color="#FF3D00" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recent approved/rejected */}
        {activeTab === 'pending' && claims.filter(c => c.status !== 'pending').length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 12 }}>GEÇMİŞ TALEPLEr</Text>
            {claims.filter(c => c.status !== 'pending').slice(0, 5).map(claim => (
              <View key={claim.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)' }}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>{claim.rewardEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#E0D0FF' : '#2D1B69' }}>{claim.rewardTitle} — {claim.memberName}</Text>
                  <Text style={{ fontSize: 11, color: claim.status === 'approved' ? '#00C853' : '#FF3D00', fontWeight: '700' }}>
                    {claim.status === 'approved' ? '✅ Onaylandı' : '❌ Reddedildi'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Reward Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAddModal(false)} />
          <View style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFE0B2' : '#5D2E00' }}>🎁 Yeni Ödül Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={22} color={isDark ? '#9B7EC8' : '#7B5CB8'} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 8 }}>EMOJİ SEÇ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity key={e} onPress={() => setNewEmoji(e)} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: newEmoji === e ? '#FF9500' : (isDark ? 'rgba(255,255,255,0.08)' : '#F5F0FF') }}>
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput placeholder="Ödül adı (örn: Sinema Bileti)" placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'} value={newTitle} onChangeText={setNewTitle} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#FFE0B2' : '#5D2E00', fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.3)' }} />
            <TextInput placeholder="Gereken yıldız sayısı (örn: 30)" placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'} value={newCost} onChangeText={setNewCost} keyboardType="number-pad" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#FFE0B2' : '#5D2E00', fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.3)' }} />
            <TextInput placeholder="Açıklama (isteğe bağlı)" placeholderTextColor={isDark ? '#5B4A7A' : '#A090C0'} value={newDesc} onChangeText={setNewDesc} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F0FF', borderRadius: 14, paddingHorizontal: 14, height: 48, color: isDark ? '#FFE0B2' : '#5D2E00', fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,149,0,0.2)' : 'rgba(255,149,0,0.3)' }} />
            <TouchableOpacity onPress={handleAddReward} disabled={saving} style={{ height: 52, backgroundColor: '#FF9500', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Ödülü Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Claim Modal */}
      <Modal visible={showClaimModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowClaimModal(false)} />
          <View style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 }}>
            {selectedReward && (
              <>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 56, marginBottom: 10 }}>{selectedReward.emoji}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#FFE0B2' : '#5D2E00', textAlign: 'center' }}>{selectedReward.title}</Text>
                  <Text style={{ fontSize: 16, color: '#FF9500', fontWeight: '700', marginTop: 4 }}>{selectedReward.starCost} ⭐ gerekiyor</Text>
                  {selectedReward.description ? <Text style={{ fontSize: 13, color: isDark ? '#9B7EC8' : '#7B5CB8', marginTop: 6, textAlign: 'center' }}>{selectedReward.description}</Text> : null}
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1, marginBottom: 10 }}>KİM İÇİN TALEP EDİYORSUNUZ?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {childMembers.map(m => {
                    const balance = m.starBalance ?? 0;
                    const canAfford = balance >= selectedReward.starCost;
                    return (
                      <TouchableOpacity key={m.id} onPress={() => setClaimMember(m)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: claimMember?.id === m.id ? '#FF9500' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: claimMember?.id === m.id ? 'rgba(255,149,0,0.2)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)') }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFE0B2' : '#5D2E00' }}>{m.avatar || '👦'} {m.name}</Text>
                        <Text style={{ fontSize: 11, color: canAfford ? '#00C853' : '#FF3D00', fontWeight: '600' }}>{balance} ⭐ {canAfford ? '✓ Yeterli' : '✗ Yetersiz'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={handleClaim} disabled={saving || !claimMember} style={{ height: 52, backgroundColor: '#FF9500', borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: claimMember ? 1 : 0.5 }}>
                  <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>🎉 Talep Gönder (Onay Gerekir)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
