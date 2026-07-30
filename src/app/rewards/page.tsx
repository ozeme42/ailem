"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Star, Plus, Minus, Settings, Gift, Printer, 
  Trash2, Edit3, RotateCcw, Target, Award, Sparkles, CheckCircle2, 
  AlertCircle, History, ShoppingBag, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  FamilyMember, BehaviorRecord, FamilyRewardSettings, DEFAULT_REWARD_SETTINGS, 
  DEFAULT_POSITIVE_BEHAVIORS, DEFAULT_NEGATIVE_BEHAVIORS, BehaviorOption, getLevelInfo 
} from '@/lib/data';
import { 
  addBehaviorRecord, onBehaviorRecordsUpdate, onRewardSettingsUpdate, 
  saveFamilyRewardSettings, awardSticker, awardBigReward, removeSticker, 
  addOrUpdateBehaviorOption, deleteBehaviorOption, saveMemberRewardTarget, deleteBehaviorRecord 
} from '@/lib/dataService';
import { printRewardChartOnWeb } from '@/lib/printRewardChart';

const MEMBER_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-teal-400 to-emerald-500',
  'from-purple-500 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-cyan-500',
  'from-fuchsia-500 to-purple-600',
];

export default function RewardsPage() {
  const { user, familyId, familyMembers } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<FamilyRewardSettings>(DEFAULT_REWARD_SETTINGS);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [showMemberTarget, setShowMemberTarget] = useState(false);
  const [showManageBehaviors, setShowManageBehaviors] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Selected State
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [behaviorType, setBehaviorType] = useState<'positive' | 'negative'>('positive');

  // Form Inputs
  const [customTitle, setCustomTitle] = useState('');
  const [customStars, setCustomStars] = useState('2');
  const [customEmoji, setCustomEmoji] = useState('⭐');

  // Member Target Form
  const [targetTitle, setTargetTitle] = useState('');
  const [targetEmoji, setTargetEmoji] = useState('🎁');
  const [targetStickers, setTargetStickers] = useState('10');

  // Preset Form
  const [presetTitle, setPresetTitle] = useState('');
  const [presetEmoji, setPresetEmoji] = useState('🌟');
  const [presetStars, setPresetStars] = useState('2');
  const [presetType, setPresetType] = useState<'positive' | 'negative'>('positive');

  // Settings Form
  const [starsPerStickerInput, setStarsPerStickerInput] = useState('10');
  const [stickersPerBigRewardInput, setStickersPerBigRewardInput] = useState('10');
  const [stickerEmojiInput, setStickerEmojiInput] = useState('🌟');
  const [bigRewardTitleInput, setBigRewardTitleInput] = useState('Özel Hedef / Oyuncak');

  useEffect(() => {
    if (!familyId) return;
    const unsubSettings = onRewardSettingsUpdate(familyId, (newSettings) => {
      setSettings(newSettings);
      setStarsPerStickerInput(String(newSettings.starsPerSticker || 10));
      setStickersPerBigRewardInput(String(newSettings.stickersPerBigReward || 10));
      setStickerEmojiInput(newSettings.stickerEmoji || '🌟');
      setBigRewardTitleInput(newSettings.bigRewardTitle || 'Özel Hedef');
    });

    const unsubRecords = onBehaviorRecordsUpdate(familyId, setBehaviorRecords);
    return () => {
      unsubSettings();
      unsubRecords();
    };
  }, [familyId]);

  const childMembers = useMemo(() => {
    const children = familyMembers.filter((m) => m.role.includes('Çocuk'));
    return children.length > 0 ? children : familyMembers;
  }, [familyMembers]);

  const allPresets = useMemo(() => {
    if (settings.customBehaviors && settings.customBehaviors.length > 0) {
      return settings.customBehaviors;
    }
    return [
      ...DEFAULT_POSITIVE_BEHAVIORS.map((b, i) => ({ id: `pos_${i}`, ...b, type: 'positive' as const })),
      ...DEFAULT_NEGATIVE_BEHAVIORS.map((b, i) => ({ id: `neg_${i}`, ...b, type: 'negative' as const })),
    ];
  }, [settings.customBehaviors]);

  const openAddBehaviorModal = (member: FamilyMember, type: 'positive' | 'negative') => {
    setSelectedMember(member);
    setBehaviorType(type);
    setCustomTitle('');
    setCustomStars(type === 'positive' ? '2' : '1');
    setCustomEmoji(type === 'positive' ? '⭐' : '⚠️');
    setShowAddBehavior(true);
  };

  const openMemberTargetModal = (member: FamilyMember) => {
    setSelectedMember(member);
    const existing = settings.memberTargets?.[member.id];
    setTargetTitle(existing?.bigRewardTitle || settings.bigRewardTitle || 'Büyük Ödül');
    setTargetEmoji(existing?.bigRewardEmoji || settings.bigRewardEmoji || '🎁');
    setTargetStickers(String(existing?.stickersPerBigReward || settings.stickersPerBigReward || 10));
    setShowMemberTarget(true);
  };

  const handleSaveMemberTarget = async () => {
    if (!familyId || !selectedMember) return;
    try {
      await saveMemberRewardTarget(familyId, selectedMember.id, {
        bigRewardTitle: targetTitle.trim() || 'Büyük Ödül',
        bigRewardEmoji: targetEmoji.trim() || '🎁',
        stickersPerBigReward: parseInt(targetStickers) || 10,
      });
      setShowMemberTarget(false);
      toast({ title: 'Hedef Kaydedildi', description: `${selectedMember.name} için özel hedef güncellendi.` });
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message, variant: 'destructive' });
    }
  };

  const handleRecordBehavior = async (title: string, emoji: string, stars: number) => {
    if (!familyId || !selectedMember) return;
    try {
      await addBehaviorRecord(familyId, {
        familyId,
        memberId: selectedMember.id,
        memberName: selectedMember.name,
        title,
        emoji,
        stars,
        type: behaviorType,
        createdBy: user?.displayName || 'Ebeveyn',
      });
      setShowAddBehavior(false);
      toast({
        title: behaviorType === 'positive' ? `+${stars} Yıldız Kazandırıldı! ⭐` : `-${stars} Yıldız Düşüldü!`,
        description: `${selectedMember.name} için "${title}" davranışı kaydedildi.`,
      });
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message, variant: 'destructive' });
    }
  };

  const handleAwardStickerDirect = async (member: FamilyMember) => {
    if (!familyId) return;
    try {
      await awardSticker(familyId, member.id, member.name, settings.starsPerSticker, 1, user?.displayName || 'Ebeveyn', undefined, true);
      toast({ title: 'Etiket Kazanıldı! 🌟', description: `${member.name} 1 etiket kazandı!` });
    } catch (err: any) {
      toast({ title: 'İşlem Başarısız', description: err?.message, variant: 'destructive' });
    }
  };

  const handleAwardBigReward = async (member: FamilyMember) => {
    if (!familyId) return;
    const target = settings.memberTargets?.[member.id];
    const stickersNeeded = target?.stickersPerBigReward || settings.stickersPerBigReward;
    const rewardTitle = target?.bigRewardTitle || settings.bigRewardTitle;

    try {
      await awardBigReward(familyId, member.id, member.name, stickersNeeded, user?.displayName || 'Ebeveyn', rewardTitle);
      toast({ title: '🎉 TEBRİKLER! BÜYÜK ÖDÜL!', description: `${member.name} "${rewardTitle}" ödülünü kazandı!` });
    } catch (err: any) {
      toast({ title: 'İşlem Başarısız', description: err?.message, variant: 'destructive' });
    }
  };

  const handlePrintChart = (member: FamilyMember) => {
    printRewardChartOnWeb(member, settings, allPresets);
  };

  const handleSaveSettings = async () => {
    if (!familyId) return;
    try {
      await saveFamilyRewardSettings(familyId, {
        starsPerSticker: parseInt(starsPerStickerInput) || 10,
        stickersPerBigReward: parseInt(stickersPerBigRewardInput) || 10,
        stickerEmoji: stickerEmojiInput.trim() || '🌟',
        bigRewardTitle: bigRewardTitleInput.trim() || 'Büyük Ödül',
      });
      setShowSettings(false);
      toast({ title: 'Ayarlar Güncellendi', description: 'Ödül sistemi ayarları başarıyla kaydedildi.' });
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message, variant: 'destructive' });
    }
  };

  const handleSavePreset = async () => {
    if (!familyId || !presetTitle.trim()) return;
    try {
      const option: BehaviorOption = {
        id: `custom_${Date.now()}`,
        title: presetTitle.trim(),
        emoji: presetEmoji.trim() || '⭐',
        stars: parseInt(presetStars) || 1,
        type: presetType,
      };
      await addOrUpdateBehaviorOption(familyId, option);
      setPresetTitle('');
      toast({ title: 'Hazır Davranış Eklendi' });
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message, variant: 'destructive' });
    }
  };

  const handleDeletePreset = async (optionId: string) => {
    if (!familyId) return;
    try {
      await deleteBehaviorOption(familyId, optionId);
      toast({ title: 'Davranış Silindi' });
    } catch (err: any) {
      toast({ title: 'Hata', description: err?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                ⭐ Davranış & Ödül Sistemi
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                {settings.starsPerSticker}⭐ → 1 {settings.stickerEmoji} Etiket → {settings.stickersPerBigReward} {settings.stickerEmoji} → {settings.bigRewardTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowManageBehaviors(true)}
              className="rounded-xl border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Hazır Davranışlar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="rounded-xl border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50"
            >
              <History className="w-4 h-4 mr-2" /> Geçmiş
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="rounded-xl border-slate-200 dark:border-slate-800"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Children Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {childMembers.map((member, index) => {
            const starBalance = member.starBalance ?? 0;
            const stickerBalance = member.stickerBalance ?? 0;
            const totalBigRewards = member.totalBigRewardsEarned ?? 0;

            const memberTarget = settings.memberTargets?.[member.id];
            const memberBigRewardTitle = memberTarget?.bigRewardTitle || settings.bigRewardTitle || 'Büyük Ödül';
            const memberBigRewardEmoji = memberTarget?.bigRewardEmoji || settings.bigRewardEmoji || '🎁';
            const memberStickersNeeded = memberTarget?.stickersPerBigReward || settings.stickersPerBigReward || 10;

            const levelInfo = getLevelInfo(member.totalStarsEarned || 0);

            const progressToSticker = Math.min(100, Math.round((starBalance / settings.starsPerSticker) * 100));
            const progressToBigReward = Math.min(100, Math.round((stickerBalance / memberStickersNeeded) * 100));
            const canClaimSticker = starBalance >= settings.starsPerSticker;
            const canClaimBigReward = stickerBalance >= memberStickersNeeded;

            const gradientClass = MEMBER_GRADIENTS[index % MEMBER_GRADIENTS.length];

            return (
              <Card key={member.id} className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-shadow">
                {/* Header Banner */}
                <div className={`bg-gradient-to-r ${gradientClass} p-5 text-white relative`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl bg-white/20 backdrop-blur-md rounded-2xl w-14 h-14 flex items-center justify-center border border-white/30 shadow-inner">
                        {member.avatar || (member.role === 'Kız Çocuk' ? '👧' : '👦')}
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-white tracking-wide">{member.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold border border-white/30 flex items-center gap-1">
                            <span>{levelInfo.emoji}</span>
                            <span>{levelInfo.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handlePrintChart(member)}
                      className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/40 rounded-xl text-xs font-bold"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1.5" /> 🖨️ Yazdır / PDF
                    </Button>
                  </div>

                  {/* Target Goal Banner */}
                  <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                    <button
                      onClick={() => openMemberTargetModal(member)}
                      className="flex items-center gap-2 text-xs font-bold bg-black/15 hover:bg-black/25 px-3 py-1.5 rounded-xl border border-white/20 transition-colors"
                    >
                      <Target className="w-3.5 h-3.5 text-amber-300" />
                      <span>Hedef: {memberBigRewardEmoji} {memberBigRewardTitle} ({memberStickersNeeded} {settings.stickerEmoji})</span>
                      <Edit3 className="w-3 h-3 opacity-70" />
                    </button>

                    {totalBigRewards > 0 && (
                      <span className="text-xs font-bold bg-amber-400/30 px-2.5 py-1 rounded-xl border border-amber-300/40">
                        🏆 {totalBigRewards} Ödül
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 space-y-5">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Stars Stat */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl">
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
                        <span className="text-xs font-bold">Yıldız Bakiyesi</span>
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      </div>
                      <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200">
                        {starBalance} <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">/ {settings.starsPerSticker} ⭐</span>
                      </div>
                      <Progress value={progressToSticker} className="h-2 mt-2 bg-amber-200 dark:bg-amber-900" />
                    </div>

                    {/* Stickers Stat */}
                    <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 p-4 rounded-2xl">
                      <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
                        <span className="text-xs font-bold">Etiket Bakiyesi</span>
                        <span className="text-base">{settings.stickerEmoji}</span>
                      </div>
                      <div className="text-2xl font-extrabold text-purple-900 dark:text-purple-200">
                        {stickerBalance} <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">/ {memberStickersNeeded} {settings.stickerEmoji}</span>
                      </div>
                      <Progress value={progressToBigReward} className="h-2 mt-2 bg-purple-200 dark:bg-purple-900" />
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => openAddBehaviorModal(member, 'positive')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-5 font-bold text-xs shadow-sm"
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> + Yıldız Ver
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => openAddBehaviorModal(member, 'negative')}
                      className="border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl py-5 font-bold text-xs"
                    >
                      <Minus className="w-4 h-4 mr-1.5" /> - Yıldız Düş
                    </Button>
                  </div>

                  {/* Conversion Actions */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {canClaimSticker && (
                      <Button
                        onClick={() => handleAwardStickerDirect(member)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs py-5 animate-pulse shadow-md"
                      >
                        <Sparkles className="w-4 h-4 mr-2" /> 10 Yıldızı {settings.stickerEmoji} Etikete Dönüştür!
                      </Button>
                    )}

                    {canClaimBigReward && (
                      <Button
                        onClick={() => handleAwardBigReward(member)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs py-5 shadow-lg"
                      >
                        <Gift className="w-4 h-4 mr-2" /> {memberBigRewardEmoji} "{memberBigRewardTitle}" Ödülünü Al!
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      </div>

      {/* Add Behavior Modal */}
      <Dialog open={showAddBehavior} onOpenChange={setShowAddBehavior}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{behaviorType === 'positive' ? '⭐ Olumlu Davranış Ekle' : '⚠️ Olumsuz Davranış'}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedMember?.name} için davranış seçin veya yeni bir not girin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {allPresets
                .filter((p) => p.type === behaviorType)
                .map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleRecordBehavior(preset.title, preset.emoji, preset.stars)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      behaviorType === 'positive'
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        : 'border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xl flex-shrink-0">{preset.emoji}</span>
                      <span className="text-xs font-bold truncate">{preset.title}</span>
                    </div>
                    <span className="text-xs font-extrabold ml-1 flex-shrink-0">
                      {behaviorType === 'positive' ? `+${preset.stars}` : `-${preset.stars}`}⭐
                    </span>
                  </button>
                ))}
            </div>

            {/* Custom Input */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3">
              <span className="text-xs font-bold text-slate-500">Özel Davranış Gir:</span>
              <div className="flex gap-2">
                <Input
                  placeholder="Emoji"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  className="w-16 text-center"
                />
                <Input
                  placeholder="Davranış başlığı..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Yıldız"
                  value={customStars}
                  onChange={(e) => setCustomStars(e.target.value)}
                  className="w-20 text-center"
                />
              </div>
              <Button
                disabled={!customTitle.trim()}
                onClick={() => handleRecordBehavior(customTitle.trim(), customEmoji.trim() || '⭐', parseInt(customStars) || 1)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
              >
                Özel Davranışı Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Target Modal */}
      <Dialog open={showMemberTarget} onOpenChange={setShowMemberTarget}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>🎯 Kişisel Büyük Ödül Hedefi</DialogTitle>
            <DialogDescription>
              {selectedMember?.name} için özel hedef ve etiket gereksinimini belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Hedef Ödül Başlığı</label>
              <Input
                placeholder="Örn: Bisiklet, Oyuncak Seti"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Emoji Simge</label>
                <Input
                  placeholder="Örn: 🚲, 🎮"
                  value={targetEmoji}
                  onChange={(e) => setTargetEmoji(e.target.value)}
                  className="mt-1 text-center"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Gerekli Etiket Sayısı</label>
                <Input
                  type="number"
                  placeholder="10"
                  value={targetStickers}
                  onChange={(e) => setTargetStickers(e.target.value)}
                  className="mt-1 text-center"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveMemberTarget} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
              Hedefi Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>⚙️ Ödül Sistemi Genel Ayarları</DialogTitle>
            <DialogDescription>
              Tüm aile üyeleri için varsayılan etiket ve ödül kuralları.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">1 Etiket İçin Yıldız Sayısı</label>
              <Input
                type="number"
                value={starsPerStickerInput}
                onChange={(e) => setStarsPerStickerInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">1 Büyük Ödül İçin Etiket Sayısı</label>
              <Input
                type="number"
                value={stickersPerBigRewardInput}
                onChange={(e) => setStickersPerBigRewardInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Etiket Emojisi</label>
              <Input
                value={stickerEmojiInput}
                onChange={(e) => setStickerEmojiInput(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Varsayılan Büyük Ödül Adı</label>
              <Input
                value={bigRewardTitleInput}
                onChange={(e) => setBigRewardTitleInput(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveSettings} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
              Ayarları Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Behavior Presets Modal */}
      <Dialog open={showManageBehaviors} onOpenChange={setShowManageBehaviors}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>✏️ Hazır Davranış Şablonları</DialogTitle>
            <DialogDescription>
              Tek tıkla yıldız vermek için kullanılan hazır davranışları yönetin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* New Preset Form */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Yeni Şablon Ekle:</span>
              <div className="grid grid-cols-4 gap-2">
                <Input
                  placeholder="Emoji"
                  value={presetEmoji}
                  onChange={(e) => setPresetEmoji(e.target.value)}
                  className="text-center"
                />
                <Input
                  placeholder="Başlık..."
                  value={presetTitle}
                  onChange={(e) => setPresetTitle(e.target.value)}
                  className="col-span-2"
                />
                <Input
                  type="number"
                  placeholder="Puan"
                  value={presetStars}
                  onChange={(e) => setPresetStars(e.target.value)}
                  className="text-center"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={presetType}
                  onChange={(e) => setPresetType(e.target.value as any)}
                  className="text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-1"
                >
                  <option value="positive">🟢 Olumlu (+ Yıldız)</option>
                  <option value="negative">🔴 Olumsuz (- Yıldız)</option>
                </select>
                <Button onClick={handleSavePreset} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs">
                  Ekle
                </Button>
              </div>
            </div>

            {/* Presets List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {allPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{preset.emoji}</span>
                    <span className="text-xs font-bold">{preset.title}</span>
                    <Badge variant={preset.type === 'positive' ? 'default' : 'destructive'} className="text-[10px]">
                      {preset.type === 'positive' ? `+${preset.stars}` : `-${preset.stars}`} ⭐
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg p-1.5 h-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>📜 Davranış ve Ödül Geçmişi</DialogTitle>
            <DialogDescription>
              Son eklenen yıldız ve davranış kayıtları.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 py-2">
            {behaviorRecords.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                Henüz kayıt bulunmuyor.
              </div>
            ) : (
              behaviorRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{record.emoji}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{record.memberName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(record.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{record.title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={record.type === 'positive' ? 'default' : 'destructive'} className="font-bold">
                      {record.type === 'positive' ? `+${record.stars}` : `-${record.stars}`} ⭐
                    </Badge>
                    {familyId && record.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteBehaviorRecord(familyId, record.id!, record.memberId, record.stars, record.type)}
                        className="text-slate-400 hover:text-rose-500 rounded-lg p-1.5 h-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
