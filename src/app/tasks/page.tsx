"use client";

import * as React from "react";
import {
  Plus, Search, Star, X,
  Trophy, Target, CheckCircle2,
  ListTodo, Flame, LayoutGrid, Zap, Check, Edit, Trash2, MoreHorizontal, ArrowLeft,
  BookOpen, GraduationCap, Calendar, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  subDays, isSameDay, startOfDay, format,
} from "date-fns";
import { tr } from "date-fns/locale";

import { useAuth } from "@/components/auth-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NewTaskForm } from "@/components/new-task-form";

import { TaskItem } from "@/components/task-item";
import { HabitTrackerCard } from "@/components/habit-tracker-card";
import { Task, StudyAssignment, MemorizationItem, MemorizationProgress, PrayerProgress } from "@/lib/data";
import {
    onTasksUpdate, updateHabitCompletion, deleteTask,
    onStudyAssignmentsUpdate, updateStudyAssignment,
    onMemorizationItemsUpdate, onMemorizationProgressUpdate, updateMemorizationProgress,
    onPrayerProgressUpdate, updatePrayerProgress
} from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const COLORS = [
  { bg: "bg-red-400",    light: "bg-red-50 border-red-200",     dark: "dark:bg-red-500/20 dark:border-red-400/30",    text: "text-red-700 dark:text-red-300" },
  { bg: "bg-orange-400", light: "bg-orange-50 border-orange-200", dark: "dark:bg-orange-500/20 dark:border-orange-400/30", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-amber-400",  light: "bg-amber-50 border-amber-200",  dark: "dark:bg-amber-500/20 dark:border-amber-400/30",  text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-green-400",  light: "bg-green-50 border-green-200",  dark: "dark:bg-green-500/20 dark:border-green-400/30",  text: "text-green-700 dark:text-green-300" },
  { bg: "bg-teal-400",   light: "bg-teal-50 border-teal-200",   dark: "dark:bg-teal-500/20 dark:border-teal-400/30",   text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-blue-400",   light: "bg-blue-50 border-blue-200",   dark: "dark:bg-blue-500/20 dark:border-blue-400/30",   text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-indigo-400", light: "bg-indigo-50 border-indigo-200", dark: "dark:bg-indigo-500/20 dark:border-indigo-400/30", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-purple-400", light: "bg-purple-50 border-purple-200", dark: "dark:bg-purple-500/20 dark:border-purple-400/30", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-pink-400",   light: "bg-pink-50 border-pink-200",   dark: "dark:bg-pink-500/20 dark:border-pink-400/30",   text: "text-pink-700 dark:text-pink-300" },
];

const MODULE_COLORS: Record<string, (typeof COLORS)[0]> = {
  "Egitim": COLORS[5],
  "Ezber":  COLORS[3],
  "Namaz":  COLORS[2],
};

function getModuleColor(module: string) {
  return MODULE_COLORS[module] || COLORS[6];
}

const MiniTaskRow = ({ task, assignee, color, onToggle, onEdit, onDelete }: {
  task: { id: string; title: string; dueDate?: string; isCompleted?: boolean };
  assignee?: { name: string; color?: string };
  color: (typeof COLORS)[0];
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) => (
  <div className={cn(
    "flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all duration-200 group",
    task.isCompleted
      ? "opacity-50 bg-slate-100 dark:bg-slate-800/50 border-transparent"
      : cn(color.light, color.dark)
  )}>
    <button
      onClick={onToggle}
      className={cn(
        "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300",
        task.isCompleted
          ? "border-transparent bg-slate-400"
          : cn("border-current", color.text, "hover:scale-110 active:scale-95")
      )}
    >
      {task.isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </button>
    <span className={cn(
      "flex-1 text-sm font-semibold truncate",
      task.isCompleted ? "line-through text-slate-400 dark:text-slate-500" : color.text
    )}>
      {task.title}
    </span>
    <div className="flex items-center gap-1.5 shrink-0">
      {assignee && (
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
          style={{ backgroundColor: assignee.color || "#888" }}
          title={assignee.name}
        >{assignee.name[0]}</span>
      )}
      {task.dueDate && !task.isCompleted && (
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-lg opacity-70", color.text)}>
          {format(new Date(task.dueDate), "d MMM", { locale: tr })}
        </span>
      )}
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity", color.text, "hover:bg-black/10")}>
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer rounded-lg">
                <Edit className="w-4 h-4 mr-2 text-blue-500" /> Duzenle
              </DropdownMenuItem>
            )}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer rounded-lg">
                    <Trash2 className="w-4 h-4 mr-2" /> Sil
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Emin misin?</AlertDialogTitle>
                    <AlertDialogDescription>Bu gorevi silmek uzeresin.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Vazgec</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  </div>
);

const ModuleRow = ({ task, assignee }: { task: any; assignee: any }) => {
  const [loading, setLoading] = React.useState(false);
  const c = getModuleColor(task.module);
  const Icon = task.icon;
  const handleToggle = async () => {
    setLoading(true);
    try { await task.onToggle(!task.isCompleted); } finally { setLoading(false); }
  };
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all duration-200 group",
      task.isCompleted
        ? "opacity-50 bg-slate-100 dark:bg-slate-800/50 border-transparent"
        : cn(c.light, c.dark)
    )}>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300",
          task.isCompleted ? "border-transparent bg-slate-400" : cn("border-current", c.text, "hover:scale-110"),
          loading && "opacity-50 cursor-wait"
        )}
      >
        {task.isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
      <span className={cn("flex-1 text-sm font-semibold truncate", task.isCompleted ? "line-through text-slate-400" : c.text)}>
        {task.title}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-1", c.text, "bg-white/60 dark:bg-black/20")}>
          <Icon className="w-2.5 h-2.5" />{task.module}
        </span>
        {assignee && (
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
            style={{ backgroundColor: assignee.color || "#888" }}
            title={assignee.name}
          >{assignee.name[0]}</span>
        )}
      </div>
    </div>
  );
};

const CategoryGroup = ({ emoji, title, color, count, children, defaultOpen = true }: {
  emoji: string;
  title: string;
  color: (typeof COLORS)[0];
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-sm", color.bg)}>
            {emoji}
          </div>
          <div>
            <p className="font-black text-sm text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{count} gorev</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 dark:border-white/5 pt-2">
          {children}
        </div>
      )}
    </div>
  );
};

type ModuleTask = {
    id: string;
    title: string;
    module: string;
    assigneeId: string;
    isCompleted: boolean;
    dueDate?: string;
    icon: any;
    color: string;
    bgClass?: string;
    onToggle: (completed: boolean) => Promise<void>;
};

export default function TasksPage() {
  const router = useRouter();
  const { user, familyMembers } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [studyAssignments, setStudyAssignments] = React.useState<StudyAssignment[]>([]);
  const [memorizationItems, setMemorizationItems] = React.useState<MemorizationItem[]>([]);
  const [memorizationProgress, setMemorizationProgress] = React.useState<MemorizationProgress[]>([]);
  const [prayerProgress, setPrayerProgress] = React.useState<PrayerProgress[]>([]);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [activeTab, setActiveTab] = React.useState<"tasks" | "habits">("tasks");
  const [taskFilter, setTaskFilter] = React.useState<"pending" | "completed">("pending");
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    const a = onTasksUpdate(setTasks);
    const b = onStudyAssignmentsUpdate(setStudyAssignments);
    const c = onMemorizationItemsUpdate(setMemorizationItems);
    const d = onMemorizationProgressUpdate(setMemorizationProgress);
    const e = onPrayerProgressUpdate(setPrayerProgress);
    return () => { a(); b(); c(); d(); e(); };
  }, []);

  const getAssignee = (id: string) => familyMembers.find((m) => m.id === id);
  const handleOpenEditTask = (task: Task) => { setEditingTask(task); setIsFormDialogOpen(true); };
  const handleOpenNewTask = () => { setEditingTask(null); setIsFormDialogOpen(true); };
  const handleDeleteTask = async (taskId: string) => {
    try { await deleteTask(taskId); toast({ title: "Silindi" }); }
    catch { toast({ title: "Hata", variant: "destructive" }); }
  };
  const handleToggleDay = async (taskId: string, day: Date, isCompleted: boolean) => {
    try { await updateHabitCompletion(taskId, day, isCompleted); }
    catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const moduleTasks = React.useMemo((): ModuleTask[] => {
    const list: ModuleTask[] = [];

    studyAssignments.forEach(sa => {
      if (!sa.studentId) return;
      if (selectedMemberId && sa.studentId !== selectedMemberId) return;
      const asgn = getAssignee(sa.studentId);
      const s = searchTerm.toLowerCase();
      if (!sa.topic.toLowerCase().includes(s) && !(asgn?.name.toLowerCase().includes(s))) return;
      list.push({
        id: `edu-${sa.id}`, title: `${sa.subject} - ${sa.topic}`, module: "Egitim",
        assigneeId: sa.studentId, isCompleted: sa.status === "completed", dueDate: sa.dueDate,
        icon: BookOpen, color: "", bgClass: "",
        onToggle: async (c) => { await updateStudyAssignment(sa.id, { status: c ? "completed" : "assigned" }); }
      });
    });

    memorizationItems.forEach(mi => {
      familyMembers.forEach(member => {
        if (selectedMemberId && member.id !== selectedMemberId) return;
        const prog = memorizationProgress.find(p => p.itemId === mi.id && p.memberId === member.id);
        if (!prog) return;
        const s = searchTerm.toLowerCase();
        if (!mi.title.toLowerCase().includes(s) && !member.name.toLowerCase().includes(s)) return;
        list.push({
          id: `mem-${mi.id}-${member.id}`, title: mi.title, module: "Ezber",
          assigneeId: member.id, isCompleted: prog.completed, icon: GraduationCap, color: "", bgClass: "",
          onToggle: async (c) => { await updateMemorizationProgress(mi.id, member.id, c); }
        });
      });
    });

    const PRAYERS = ["Sabah", "Ogle", "Ikindi", "Aksam", "Yatsi"];
    familyMembers.forEach(member => {
      if (!member.role.includes("Cocuk")) return;
      if (selectedMemberId && member.id !== selectedMemberId) return;
      const s = searchTerm.toLowerCase();
      if (!"namaz".includes(s) && !member.name.toLowerCase().includes(s)) return;
      const pProg = prayerProgress.find(p => p.memberId === member.id);
      const completions: string[] = pProg?.completions?.[todayStr] || [];
      PRAYERS.forEach(prayer => {
        list.push({
          id: `prayer-${member.id}-${prayer}`, title: `${prayer} Namazi`, module: "Namaz",
          assigneeId: member.id, isCompleted: completions.includes(prayer), icon: Target, color: "", bgClass: "",
          onToggle: async (c) => {
            const nc = c ? [...completions, prayer] : completions.filter((p: string) => p !== prayer);
            await updatePrayerProgress(member.id, todayStr, nc);
          }
        });
      });
    });

    return list;
  }, [studyAssignments, memorizationItems, memorizationProgress, prayerProgress, familyMembers, searchTerm, selectedMemberId]);

  const pendingModuleTasks = React.useMemo(() => moduleTasks.filter(t => !t.isCompleted), [moduleTasks]);
  const completedModuleTasks = React.useMemo(() => moduleTasks.filter(t => t.isCompleted), [moduleTasks]);

  const { pendingTasks, completedTasks, habits, stats } = React.useMemo(() => {
    const filtered = tasks.filter(t => {
      if (selectedMemberId && t.assigneeId !== selectedMemberId) return false;
      const s = searchTerm.toLowerCase();
      return t.title.toLowerCase().includes(s) || (getAssignee(t.assigneeId)?.name.toLowerCase().includes(s));
    });
    const pending = filtered.filter(t => !t.isRecurring && !t.completed);
    const completed = filtered.filter(t => !t.isRecurring && t.completed);
    const habitList = filtered.filter(t => t.isRecurring);
    return {
      pendingTasks: pending, completedTasks: completed, habits: habitList,
      stats: {
        totalPending: pending.length + pendingModuleTasks.length,
        totalHabits: habitList.length,
        userXP: selectedMemberId
          ? familyMembers.find(m => m.id === selectedMemberId)?.xp || 0
          : (user ? familyMembers.find(m => m.id === user.uid)?.xp || 0 : 0)
      }
    };
  }, [tasks, searchTerm, familyMembers, user, pendingModuleTasks.length, selectedMemberId]);

  const todayLabel = format(new Date(), "d MMMM EEEE", { locale: tr });

  const HABIT_COLORS = [
    "bg-red-50 border-red-200 text-red-900 dark:bg-red-500/20 dark:border-red-400/30 dark:text-red-100",
    "bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-500/20 dark:border-orange-400/30 dark:text-orange-100",
    "bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-500/20 dark:border-purple-400/30 dark:text-purple-100",
    "bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-500/20 dark:border-teal-400/30 dark:text-teal-100",
    "bg-pink-50 border-pink-200 text-pink-900 dark:bg-pink-500/20 dark:border-pink-400/30 dark:text-pink-100",
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-32 md:pb-10">

      <div className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full w-9 h-9 text-slate-500 hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{todayLabel}</p>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Gorevlerim</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1.5 rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 text-xs font-bold">
                {stats.totalHabits} aliskanlik
              </span>
              <span className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-xs font-bold">
                {stats.userXP} XP
              </span>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Gorev ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-2xl h-10 bg-slate-100 dark:bg-slate-800 border-transparent focus-visible:ring-2 focus-visible:ring-indigo-400 text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedMemberId(null)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                selectedMemberId === null
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              Tumu
            </button>
            {familyMembers.map(member => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedMemberId === member.id ? "text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
                style={selectedMemberId === member.id ? { backgroundColor: member.color } : {}}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: member.color }}>
                  {member.name[0]}
                </span>
                {member.name}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 border-b border-slate-200 dark:border-white/10">
            {[
              { key: "tasks", label: "Gorevler", count: pendingTasks.length + pendingModuleTasks.length, emoji: "✅" },
              { key: "habits", label: "Aliskanliklar", count: habits.length, emoji: "🔥" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "tasks" | "habits")}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px]",
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <span>{tab.emoji}</span>
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-lg text-[10px] font-black",
                    activeTab === tab.key ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {activeTab === "tasks" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="flex gap-2">
              {[
                { key: "pending", label: "Yapilacaklar", count: pendingTasks.length + pendingModuleTasks.length, emoji: "📋" },
                { key: "completed", label: "Tamamlananlar", count: completedTasks.length + completedModuleTasks.length, emoji: "✅" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setTaskFilter(f.key as "pending" | "completed")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all",
                    taskFilter === f.key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                  )}
                >
                  <span>{f.emoji}</span>
                  {f.label}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[10px] font-black",
                    taskFilter === f.key ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>{f.count}</span>
                </button>
              ))}
            </div>

            {taskFilter === "pending" ? (
              <>
                {pendingTasks.length > 0 && (
                  <CategoryGroup emoji="📌" title="Kisisel Gorevler" color={COLORS[6]} count={pendingTasks.length}>
                    {pendingTasks.map((task, i) => (
                      <MiniTaskRow
                        key={task.id}
                        task={{ ...task, isCompleted: task.completed }}
                        assignee={getAssignee(task.assigneeId)}
                        color={COLORS[i % COLORS.length]}
                        onToggle={() => {}}
                        onEdit={() => handleOpenEditTask(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </CategoryGroup>
                )}

                {pendingModuleTasks.filter(t => t.module === "Egitim").length > 0 && (
                  <CategoryGroup emoji="📚" title="Egitim" color={MODULE_COLORS["Egitim"]} count={pendingModuleTasks.filter(t => t.module === "Egitim").length}>
                    {pendingModuleTasks.filter(t => t.module === "Egitim").map(mt => (
                      <ModuleRow key={mt.id} task={mt} assignee={getAssignee(mt.assigneeId)} />
                    ))}
                  </CategoryGroup>
                )}

                {pendingModuleTasks.filter(t => t.module === "Ezber").length > 0 && (
                  <CategoryGroup emoji="🧠" title="Ezber" color={MODULE_COLORS["Ezber"]} count={pendingModuleTasks.filter(t => t.module === "Ezber").length}>
                    {pendingModuleTasks.filter(t => t.module === "Ezber").map(mt => (
                      <ModuleRow key={mt.id} task={mt} assignee={getAssignee(mt.assigneeId)} />
                    ))}
                  </CategoryGroup>
                )}

                {pendingModuleTasks.filter(t => t.module === "Namaz").length > 0 && (
                  <CategoryGroup emoji="🕌" title="Namaz" color={MODULE_COLORS["Namaz"]} count={pendingModuleTasks.filter(t => t.module === "Namaz").length}>
                    {pendingModuleTasks.filter(t => t.module === "Namaz").map(mt => (
                      <ModuleRow key={mt.id} task={mt} assignee={getAssignee(mt.assigneeId)} />
                    ))}
                  </CategoryGroup>
                )}

                {pendingTasks.length === 0 && pendingModuleTasks.length === 0 && (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">Supersin!</p>
                    <p className="text-sm text-slate-500 mt-2">Yapilacak hic gorev kalmadi.</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {completedTasks.length > 0 && (
                  <CategoryGroup emoji="✅" title="Tamamlanan Gorevler" color={COLORS[3]} count={completedTasks.length} defaultOpen={false}>
                    {completedTasks.map((task, i) => (
                      <MiniTaskRow
                        key={task.id}
                        task={{ ...task, isCompleted: true }}
                        assignee={getAssignee(task.assigneeId)}
                        color={COLORS[i % COLORS.length]}
                        onToggle={() => {}}
                        onEdit={() => handleOpenEditTask(task)}
                        onDelete={() => handleDeleteTask(task.id)}
                      />
                    ))}
                  </CategoryGroup>
                )}

                {completedModuleTasks.length > 0 && (
                  <CategoryGroup emoji="📖" title="Diger Tamamlananlar" color={COLORS[4]} count={completedModuleTasks.length} defaultOpen={false}>
                    {completedModuleTasks.map(mt => (
                      <ModuleRow key={mt.id} task={mt} assignee={getAssignee(mt.assigneeId)} />
                    ))}
                  </CategoryGroup>
                )}

                {completedTasks.length === 0 && completedModuleTasks.length === 0 && (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">💤</div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">Henuz biten yok</p>
                    <p className="text-sm text-slate-500 mt-2">Tamamlanan gorevler burada gorunur.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "habits" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {habits.length > 0 ? (
              habits.map((habit, index) => (
                <HabitTrackerCard
                  key={habit.id}
                  task={habit}
                  assignee={getAssignee(habit.assigneeId)}
                  onToggleDay={(day, isCompleted) => handleToggleDay(habit.id, day, isCompleted)}
                  onEdit={() => handleOpenEditTask(habit)}
                  onDelete={() => handleDeleteTask(habit.id)}
                  colorClass={HABIT_COLORS[index % HABIT_COLORS.length]}
                />
              ))
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔥</div>
                <p className="text-xl font-black text-slate-900 dark:text-white">Aliskanlik Edin</p>
                <p className="text-sm text-slate-500 mt-2">Zinciri kirmadan devam edecek hedefler ekle.</p>
              </div>
            )}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-slate-900 dark:text-white">Liderlik Tablosu</h3>
          </div>
          <div className="p-3 space-y-1">
            {[...familyMembers].sort((a, b) => b.xp - a.xp).map((member, i) => (
              <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center font-black text-xs",
                  i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}>{i + 1}</span>
                <Avatar className="w-8 h-8 border-2 border-white dark:border-slate-700">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback style={{ backgroundColor: member.color }} className="text-white text-xs font-bold">
                    {member.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-slate-900 dark:text-white">{member.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Seviye {member.level}</p>
                </div>
                <span className="font-black text-sm text-amber-500">⭐ {member.xp.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleOpenNewTask}
        className="fixed bottom-24 right-5 md:bottom-8 z-50 w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-all hover:bg-indigo-700 hover:scale-105"
      >
        <Plus className="w-7 h-7" />
      </button>

      {isFormDialogOpen && (
        <div className="fixed inset-x-0 top-0 bottom-16 sm:inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsFormDialogOpen(false)} />
          <div className={cn(
            "relative w-full sm:max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden",
            "animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300",
            "rounded-t-[2.5rem] sm:rounded-[2rem] max-h-full sm:max-h-[90vh] sm:shadow-2xl",
          )}>
            <div className="flex justify-center pt-4 pb-1 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="flex items-center justify-between px-6 pt-4 pb-4 sm:pt-6 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                  {editingTask ? <LayoutGrid className="w-5 h-5 text-white" /> : <Target className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-black">{editingTask ? "Gorevi Duzenle" : "Yeni Gorev"}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{editingTask ? "Mevcut gorevi guncelle" : "Aile icin yeni hedef ekle"}</p>
                </div>
              </div>
              <button onClick={() => setIsFormDialogOpen(false)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 overscroll-contain">
              <NewTaskForm
                familyMembers={familyMembers}
                onTaskProcessed={() => setIsFormDialogOpen(false)}
                taskToEdit={editingTask}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
