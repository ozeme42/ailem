import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, TrendingUp, TrendingDown, Star, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/auth-context';
import { onBehaviorRecordsUpdate, deleteBehaviorRecord } from '../lib/dataService';
import { BehaviorRecord, FamilyMember } from '../lib/data';
import { format, isToday, isThisWeek, parseISO, subDays, startOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

export default function BehaviorHistoryScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { familyId, familyMembers } = useAuth();
  const params = useLocalSearchParams<{ memberId?: string; memberName?: string }>();

  const [records, setRecords] = useState<BehaviorRecord[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(params.memberId || null);
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  const childMembers = useMemo(() =>
    (familyMembers || []).filter(m => m.role === 'Kız Çocuk' || m.role === 'Erkek Çocuk'),
    [familyMembers]
  );

  useEffect(() => {
    if (!familyId) return;
    const unsub = onBehaviorRecordsUpdate(familyId, setRecords);
    return () => unsub();
  }, [familyId]);

  const handleDeleteRecord = (rec: BehaviorRecord) => {
    if (!familyId) return;
    const verb = rec.type === 'positive' ? 'düşülecektir' : 'geri eklenecektir';
    Alert.alert(
      'Kayıt Silinsin mi?',
      `"${rec.title}" kaydı silinecektir. ${rec.memberName} kullanıcısının bakiyesinden ${rec.stars} ⭐ ${verb}.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive', onPress: async () => {
            try {
              await deleteBehaviorRecord(familyId, rec.id);
            } catch {
              Alert.alert('Hata', 'Kayıt silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const filteredRecords = useMemo(() => {
    let r = records;
    if (filterMemberId) r = r.filter(rec => rec.memberId === filterMemberId);
    if (filterType !== 'all') r = r.filter(rec => rec.type === filterType);
    return r;
  }, [records, filterMemberId, filterType]);

  // Last 7 days chart data
  const chartData = useMemo(() => {
    const days: { label: string; date: Date; positive: number; negative: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayLabel = format(date, 'EEE', { locale: tr });
      const dayRecords = records.filter(r => {
        if (filterMemberId && r.memberId !== filterMemberId) return false;
        const recDate = startOfDay(parseISO(r.createdAt));
        return recDate.getTime() === dayStart.getTime();
      });
      const positive = dayRecords.filter(r => r.type === 'positive').reduce((s, r) => s + r.stars, 0);
      const negative = dayRecords.filter(r => r.type === 'negative').reduce((s, r) => s + r.stars, 0);
      days.push({ label: dayLabel, date, positive, negative });
    }
    return days;
  }, [records, filterMemberId]);

  const maxChartValue = useMemo(() => Math.max(...chartData.map(d => Math.max(d.positive, d.negative)), 5), [chartData]);

  // Summary stats
  const stats = useMemo(() => {
    const positives = filteredRecords.filter(r => r.type === 'positive');
    const negatives = filteredRecords.filter(r => r.type === 'negative');
    return {
      totalPositive: positives.reduce((s, r) => s + r.stars, 0),
      totalNegative: negatives.reduce((s, r) => s + r.stars, 0),
      countPositive: positives.length,
      countNegative: negatives.length,
      thisWeek: filteredRecords.filter(r => isThisWeek(parseISO(r.createdAt), { locale: tr })).length,
      today: filteredRecords.filter(r => isToday(parseISO(r.createdAt))).length,
    };
  }, [filteredRecords]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, BehaviorRecord[]>();
    filteredRecords.forEach(r => {
      const dateKey = format(parseISO(r.createdAt), 'd MMMM yyyy', { locale: tr });
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(r);
    });
    return Array.from(groups.entries());
  }, [filteredRecords]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A1A' : '#F0F4FF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient colors={isDark ? ['#0D1B2A', '#1A0A2E'] : ['#E8F5E9', '#F3E5F5']} style={{ flex: 1 }} />
        <View style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(0,200,83,0.08)' }} />
        <View style={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,61,0,0.07)' }} />
      </View>

      {/* Header */}
      <View style={{ backgroundColor: isDark ? 'rgba(13,27,42,0.9)' : 'rgba(255,255,255,0.75)', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)' }}>
        <SafeAreaView edges={['top']} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
            <ChevronLeft size={28} color="#00C853" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: isDark ? '#E0FFE8' : '#1B5E20' }}>📊 Davranış Geçmişi</Text>
            <Text style={{ fontSize: 10, color: isDark ? '#00C853' : '#2E7D32', fontWeight: '600' }}>Yıldız kayıtları</Text>
          </View>
          {/* View toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', borderRadius: 12, padding: 3 }}>
            {(['list', 'chart'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: viewMode === mode ? '#00C853' : 'transparent' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: viewMode === mode ? 'white' : (isDark ? '#9B7EC8' : '#7B5CB8') }}>{mode === 'list' ? '≡' : '📊'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12, flexDirection: 'row' }}>
          {/* Member filter */}
          <TouchableOpacity
            onPress={() => setFilterMemberId(null)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: !filterMemberId ? '#00C853' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: !filterMemberId ? 'white' : (isDark ? '#9B7EC8' : '#7B5CB8') }}>👨‍👩‍👧 Hepsi</Text>
          </TouchableOpacity>
          {childMembers.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setFilterMemberId(m.id)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: filterMemberId === m.id ? '#00C853' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: filterMemberId === m.id ? 'white' : (isDark ? '#9B7EC8' : '#7B5CB8') }}>{m.avatar || '👦'} {m.name}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', height: 28, alignSelf: 'center' }} />
          {(['all', 'positive', 'negative'] as const).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilterType(type)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: filterType === type ? (type === 'positive' ? '#00C853' : type === 'negative' ? '#FF3D00' : '#00C853') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: filterType === type ? 'white' : (isDark ? '#9B7EC8' : '#7B5CB8') }}>
                {type === 'all' ? 'Tümü' : type === 'positive' ? '⭐ Olumlu' : '📉 Olumsuz'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Toplam Kazanılan', value: `+${stats.totalPositive} ⭐`, color: '#00C853', icon: <TrendingUp size={16} color="#00C853" /> },
            { label: 'Toplam Kaybedilen', value: `-${stats.totalNegative} ⭐`, color: '#FF3D00', icon: <TrendingDown size={16} color="#FF3D00" /> },
            { label: 'Bu Hafta', value: stats.thisWeek.toString(), color: '#A259FF', icon: <Star size={16} color="#A259FF" /> },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: isDark ? `${s.color}22` : `${s.color}30` }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>{s.icon}<Text style={{ fontSize: 9, fontWeight: '700', color: s.color, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</Text></View>
              <Text style={{ fontSize: 16, fontWeight: '900', color: s.color }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Chart View */}
        {viewMode === 'chart' && (
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E0FFE8' : '#1B5E20', marginBottom: 16 }}>Son 7 Gün</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140 }}>
              {chartData.map((day, i) => {
                const posH = (day.positive / maxChartValue) * 100;
                const negH = (day.negative / maxChartValue) * 100;
                const isTodays = isToday(day.date);
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' }}>
                      <View style={{ flex: 1, backgroundColor: '#00C85355', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', height: '100%' }}>
                        {day.positive > 0 && (
                          <View style={{ height: `${posH}%`, backgroundColor: '#00C853', borderRadius: 6, minHeight: 4 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#FF3D0033', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', height: '100%' }}>
                        {day.negative > 0 && (
                          <View style={{ height: `${negH}%`, backgroundColor: '#FF3D00', borderRadius: 6, minHeight: 4 }} />
                        )}
                      </View>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: isTodays ? '900' : '600', color: isTodays ? '#00C853' : (isDark ? '#9B7EC8' : '#7B5CB8') }}>{day.label}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#00C853' }} /><Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8' }}>Olumlu</Text></View>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#FF3D00' }} /><Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8' }}>Olumsuz</Text></View>
            </View>
          </View>
        )}

        {/* List View */}
        {filteredRecords.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>📋</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#E0FFE8' : '#1B5E20', marginBottom: 8 }}>Henüz kayıt yok</Text>
            <Text style={{ fontSize: 14, color: isDark ? '#00C853' : '#2E7D32', textAlign: 'center', lineHeight: 20 }}>Davranış ekranından yıldız verdikçe burada görünür.</Text>
          </View>
        ) : (
          groupedByDate.map(([dateKey, recs]) => (
            <View key={dateKey} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#9B7EC8' : '#7B5CB8', letterSpacing: 1 }}>{dateKey.toUpperCase()}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)', marginLeft: 10 }} />
              </View>
              <View style={{ gap: 8 }}>
                {recs.map(rec => (
                  <View key={rec.id} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, borderLeftColor: rec.type === 'positive' ? '#00C853' : '#FF3D00', borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)', borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)', borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: rec.type === 'positive' ? 'rgba(0,200,83,0.15)' : 'rgba(255,61,0,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: rec.type === 'positive' ? '#00C853' : '#FF3D00' }}>
                        {rec.type === 'positive' ? '+' : '-'}{rec.stars}⭐
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#E0FFE8' : '#1B5E20' }}>{rec.title}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 3 }}>
                        <Text style={{ fontSize: 11, color: isDark ? '#9B7EC8' : '#7B5CB8' }}>{rec.memberName}</Text>
                        {rec.note ? <Text style={{ fontSize: 11, color: isDark ? '#7A6A9A' : '#9B7EC8', fontStyle: 'italic' }}>• {rec.note}</Text> : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={{ fontSize: 10, color: isDark ? '#5B4A7A' : '#B0A0D0' }}>
                        {format(parseISO(rec.createdAt), 'HH:mm')}
                      </Text>
                      <TouchableOpacity onPress={() => handleDeleteRecord(rec)} style={{ padding: 4 }}>
                        <Trash2 size={15} color="#FF4D4D" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
