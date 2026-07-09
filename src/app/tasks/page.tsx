"use client";

import * as React from "react";
import {
  Plus, Search, X, Trophy, Target,
  LayoutGrid, Check, Edit, Trash2, MoreHorizontal, ArrowLeft,
  BookOpen, ChevronDown, Star, Flame
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewTaskForm } from "@/components/new-task-form";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const COLORS = [
  { bg: "bg-red-400",    light: "bg-red-50 border-red-200",       dark: "dark:bg-red-500/20 dark:border-red-400/30",      text: "text-red-700 dark:text-red-300" },
  { bg: "bg-orange-400", light: "bg-orange-50 border-orange-200", dark: "dark:bg-orange-500/20 dark:border-orange-400/30", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-amber-400",  light: "bg-amber-50 border-amber-200",   dark: "dark:bg-amber-500/20 dark:border-amber-400/30",   text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-green-400",  light: "bg-green-50 border-green-200",   dark: "dark:bg-green-500/20 dark:border-green-400/30",   text: "text-green-700 dark:text-green-300" },
  { bg: "bg-teal-400",   light: "bg-teal-50 border-teal-200",     dark: "dark:bg-teal-500/20 dark:border-teal-400/30",     text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-blue-400",   light: "bg-blue-50 border-blue-200",     dark: "dark:bg-blue-500/20 dark:border-blue-400/30",     text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-indigo-400", light: "bg-indigo-50 border-indigo-200", dark: "dark:bg-indigo-500/20 dark:border-indigo-400/30", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-purple-400", light: "bg-purple-50 border-purple-200", dark: "dark:bg-purple-500/20 dark:border-purple-400/30", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-pink-400",   light: "bg-pink-50 border-pink-200",     dark: "dark:bg-pink-500/20 dark:border-pink-400/30",     text: "text-pink-700 dark:text-pink-300" },
];
type C = typeof COLORS[0];

const MC: Record<string, C> = { "Egitim": COLORS[5], "Ezber": COLORS[3], "Namaz": COLORS[2] };
function gc(m: string): C { return MC[m] || COLORS[6]; }

const TaskRow = ({ task, assignee, color, onEdit, onDelete }: {
  task: { id: string; title: string; dueDate?: string; isCompleted?: boolean };
  assignee?: { name: string; color?: string };
  color: C; onEdit?: () => void; onDelete?: () => void;
}) => (
  <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all group",
    task.isCompleted ? "opacity-50 bg-slate-100 dark:bg-slate-800/50 border-transparent" : cn(color.light, color.dark))}>
    <div className={cn("w-2 h-2 rounded-full flex-shrink-0", task.isCompleted ? "bg-slate-300" : color.bg)} />
    <span className={cn("flex-1 text-sm font-semibold truncate", task.isCompleted ? "line-through text-slate-400" : color.text)}>{task.title}</span>
    <div className="flex items-center gap-1.5 shrink-0">
      {assignee && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: assignee.color || "#888" }}>{assignee.name[0]}</span>}
      {task.dueDate && !task.isCompleted && <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-lg opacity-70", color.text)}>{format(new Date(task.dueDate), "d MMM", { locale: tr })}</span>}
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10", color.text)}><MoreHorizontal className="w-3.5 h-3.5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
            {onEdit && <DropdownMenuItem onClick={onEdit} className="cursor-pointer rounded-lg"><Edit className="w-4 h-4 mr-2 text-blue-500" /> Duzenle</DropdownMenuItem>}
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-rose-600 focus:bg-rose-50 cursor-pointer rounded-lg"><Trash2 className="w-4 h-4 mr-2" /> Sil</DropdownMenuItem></AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader><AlertDialogTitle>Emin misin?</AlertDialogTitle><AlertDialogDescription>Bu gorevi silmek uzeresin.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel className="rounded-xl">Vazgec</AlertDialogCancel><AlertDialogAction onClick={onDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">Sil</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  </div>
);

const ModRow = ({ task, assignee }: { task: any; assignee: any }) => {
  const [loading, setLoading] = React.useState(false);
  const c = gc(task.module);
  const Icon = task.icon;
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all", task.isCompleted ? "opacity-50 bg-slate-100 dark:bg-slate-800/50 border-transparent" : cn(c.light, c.dark))}>
      <button onClick={async () => { setLoading(true); try { await task.onToggle(!task.isCompleted); } finally { setLoading(false); } }} disabled={loading}
        className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all", task.isCompleted ? "border-transparent bg-slate-400" : cn("border-current", c.text, "hover:scale-110"), loading && "opacity-50 cursor-wait")}>
        {task.isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
      <span className={cn("flex-1 text-sm font-semibold truncate", task.isCompleted ? "line-through text-slate-400" : c.text)}>{task.title}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-1 bg-white/60 dark:bg-black/20", c.text)}><Icon className="w-2.5 h-2.5" />{task.module}</span>
        {assignee && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ backgroundColor: assignee.color || "#888" }}>{assignee.name[0]}</span>}
      </div>
    </div>
  );
};

const CatGroup = ({ emoji, title, color, count, children, open: init = true }: { emoji: string; title: string; color: C; count: number; children: React.ReactNode; open?: boolean }) => {
  const [open, setOpen] = React.useState(init);
  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-sm", color.bg)}>{emoji}</div>
          <div><p className="font-black text-sm text-slate-900 dark:text-white">{title}</p><p className="text-xs text-slate-500 font-medium">{count} gorev</p></div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open && <div className="px-3 pb-3 space-y-2 border-t border-slate-100 dark:border-white/5 pt-2">{children}</div>}
    </div>
  );
};

type MT = { id: string; title: string; module: string; assigneeId: string; isCompleted: boolean; dueDate?: string; icon: any; onToggle: (c: boolean) => Promise<void> };

export default function TasksPage() {
  const router = useRouter();
  const { user, familyMembers } = useAuth();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [sa, setSA] = React.useState<StudyAssignment[]>([]);
  const [mi, setMI] = React.useState<MemorizationItem[]>([]);
  const [mp, setMP] = React.useState<MemorizationProgress[]>([]);
  const [pp, setPP] = React.useState<PrayerProgress[]>([]);
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editTask, setEditTask] = React.useState<Task | null>(null);
  const [tab, setTab] = React.useState<"tasks"|"habits">("tasks");
  const [filter, setFilter] = React.useState<"pending"|"completed">("pending");
  const [mid, setMid] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const u1 = onTasksUpdate(setTasks);
    const u2 = onStudyAssignmentsUpdate(setSA);
    const u3 = onMemorizationItemsUpdate(setMI);
    const u4 = onMemorizationProgressUpdate(setMP);
    const u5 = onPrayerProgressUpdate(setPP);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, []);

  const ga = (id: string) => familyMembers.find(m => m.id === id);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const modTasks = React.useMemo((): MT[] => {
    const list: MT[] = [];
    const s = search.toLowerCase();
    sa.forEach(x => {
      if (!x.studentId || (mid && x.studentId !== mid)) return;
      const asgn = ga(x.studentId);
      if (!x.topic.toLowerCase().includes(s) && !asgn?.name.toLowerCase().includes(s)) return;
      list.push({ id: `edu-${x.id}`, title: `${x.subject} - ${x.topic}`, module: "Egitim", assigneeId: x.studentId, isCompleted: x.status === "completed", dueDate: x.dueDate, icon: BookOpen, onToggle: async c => { await updateStudyAssignment(x.id, { status: c ? "completed" : "assigned" }); } });
    });
    mi.forEach(item => {
      familyMembers.forEach(m => {
        if (mid && m.id !== mid) return;
        const prog = mp.find(p => p.itemId === item.id && p.memberId === m.id);
        if (!prog) return;
        if (!item.title.toLowerCase().includes(s) && !m.name.toLowerCase().includes(s)) return;
        list.push({ id: `mem-${item.id}-${m.id}`, title: item.title, module: "Ezber", assigneeId: m.id, isCompleted: prog.completed, icon: BookOpen, onToggle: async c => { await updateMemorizationProgress(item.id, m.id, c); } });
      });
    });
    const PS = ["Sabah", "Ogle", "Ikindi", "Aksam", "Yatsi"];
    familyMembers.forEach(m => {
      if (!m.role.includes("Cocuk") || (mid && m.id !== mid)) return;
      if (!"namaz".includes(s) && !m.name.toLowerCase().includes(s)) return;
      const pdata = pp.find(p => p.memberId === m.id);
      const comp: string[] = pdata?.completions?.[todayStr] || [];
      PS.forEach(pr => {
        list.push({ id: `pr-${m.id}-${pr}`, title: `${pr} Namazi`, module: "Namaz", assigneeId: m.id, isCompleted: comp.includes(pr), icon: Target, onToggle: async c => { const nc = c ? [...comp, pr] : comp.filter((x: string) => x !== pr); const currentCompletions = pdata?.completions || {}; const newCompletions = { ...currentCompletions, [todayStr]: nc }; await updatePrayerProgress(m.id, newCompletions); } });
      });
    });
    return list;
  }, [sa, mi, mp, pp, familyMembers, search, mid]);

  const pMod = modTasks.filter(t => !t.isCompleted);
  const cMod = modTasks.filter(t => t.isCompleted);

  const { pt, ct, habits, stats } = React.useMemo(() => {
    const s = search.toLowerCase();
    const fil = tasks.filter(t => {
      if (mid && t.assigneeId !== mid) return false;
      return t.title.toLowerCase().includes(s) || ga(t.assigneeId)?.name.toLowerCase().includes(s);
    });
    const pt = fil.filter(t => !t.isRecurring && !t.completed);
    const ct = fil.filter(t => !t.isRecurring && t.completed);
    const habits = fil.filter(t => t.isRecurring);
    return { pt, ct, habits, stats: { pend: pt.length + pMod.length, habs: habits.length, xp: mid ? familyMembers.find(m => m.id === mid)?.xp || 0 : (user ? familyMembers.find(m => m.id === user.uid)?.xp || 0 : 0) } };
  }, [tasks, search, familyMembers, user, pMod.length, mid]);

  const todayLabel = format(new Date(), "d MMMM EEEE", { locale: tr });
  const HC = ["bg-red-50 border-red-200 text-red-900 dark:bg-red-500/20 dark:border-red-400/30 dark:text-red-100","bg-orange-50 border-orange-200 text-orange-900 dark:bg-orange-500/20 dark:border-orange-400/30 dark:text-orange-100","bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-500/20 dark:border-purple-400/30 dark:text-purple-100","bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-500/20 dark:border-teal-400/30 dark:text-teal-100","bg-pink-50 border-pink-200 text-pink-900 dark:bg-pink-500/20 dark:border-pink-400/30 dark:text-pink-100"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-32 md:pb-10">
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full w-9 h-9 text-slate-500 hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></Button>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{todayLabel}</p>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Gorevlerim</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1.5 rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 text-xs font-bold">{stats.habs} aliskanlik</span>
              <span className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 text-xs font-bold">{stats.xp} XP</span>
            </div>
          </div>
          <div className="relative mb-3">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 hidden" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Gorev ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-2xl h-10 bg-slate-100 dark:bg-slate-800 border-transparent focus-visible:ring-2 focus-visible:ring-indigo-400 text-sm" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setMid(null)} className={cn("px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap", mid === null ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>Tumu</button>
            {familyMembers.map(m => (
              <button key={m.id} onClick={() => setMid(m.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap", mid === m.id ? "text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")} style={mid === m.id ? { backgroundColor: m.color } : {}}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white" style={{ backgroundColor: m.color }}>{m.name[0]}</span>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1 border-b border-slate-200 dark:border-white/10">
            {[{key:"tasks",lbl:"Gorevler",cnt:pt.length+pMod.length,em:"✅"},{key:"habits",lbl:"Aliskanliklar",cnt:habits.length,em:"🔥"}].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as "tasks"|"habits")} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 -mb-[2px]", tab === t.key ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                <span>{t.em}</span>{t.lbl}
                {t.cnt > 0 && <span className={cn("px-1.5 py-0.5 rounded-lg text-[10px] font-black", tab === t.key ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>{t.cnt}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {tab === "tasks" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-2">
              {[{key:"pending",lbl:"Yapilacaklar",cnt:pt.length+pMod.length,em:"📋"},{key:"completed",lbl:"Tamamlananlar",cnt:ct.length+cMod.length,em:"✅"}].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key as "pending"|"completed")} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all", filter === f.key ? "bg-indigo-600 text-white shadow-md" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10")}>
                  <span>{f.em}</span>{f.lbl}<span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-black", filter === f.key ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>{f.cnt}</span>
                </button>
              ))}
            </div>
            {filter === "pending" ? (
              <>
                {pt.length > 0 && <CatGroup emoji="📌" title="Kisisel Gorevler" color={COLORS[6]} count={pt.length}>{pt.map((t,i)=><TaskRow key={t.id} task={{...t,isCompleted:t.completed}} assignee={ga(t.assigneeId)} color={COLORS[i%COLORS.length]} onEdit={()=>{setEditTask(t);setFormOpen(true);}} onDelete={async()=>{try{await deleteTask(t.id);toast({title:"Silindi"});}catch{toast({title:"Hata",variant:"destructive"});}}} />)}</CatGroup>}
                {pMod.filter(t=>t.module==="Egitim").length>0&&<CatGroup emoji="📚" title="Egitim" color={MC["Egitim"]} count={pMod.filter(t=>t.module==="Egitim").length}>{pMod.filter(t=>t.module==="Egitim").map(mt=><ModRow key={mt.id} task={mt} assignee={ga(mt.assigneeId)} />)}</CatGroup>}
                {pMod.filter(t=>t.module==="Ezber").length>0&&<CatGroup emoji="🧠" title="Ezber" color={MC["Ezber"]} count={pMod.filter(t=>t.module==="Ezber").length}>{pMod.filter(t=>t.module==="Ezber").map(mt=><ModRow key={mt.id} task={mt} assignee={ga(mt.assigneeId)} />)}</CatGroup>}
                {pMod.filter(t=>t.module==="Namaz").length>0&&<CatGroup emoji="🕌" title="Namaz" color={MC["Namaz"]} count={pMod.filter(t=>t.module==="Namaz").length}>{pMod.filter(t=>t.module==="Namaz").map(mt=><ModRow key={mt.id} task={mt} assignee={ga(mt.assigneeId)} />)}</CatGroup>}
                {pt.length===0&&pMod.length===0&&<div className="text-center py-20"><div className="text-6xl mb-4">🎉</div><p className="text-xl font-black">Supersin!</p><p className="text-sm text-slate-500 mt-2">Yapilacak hic gorev kalmadi.</p></div>}
              </>
            ) : (
              <>
                {ct.length>0&&<CatGroup emoji="✅" title="Tamamlananlar" color={COLORS[3]} count={ct.length} open={false}>{ct.map((t,i)=><TaskRow key={t.id} task={{...t,isCompleted:true}} assignee={ga(t.assigneeId)} color={COLORS[i%COLORS.length]} onEdit={()=>{setEditTask(t);setFormOpen(true);}} onDelete={async()=>{try{await deleteTask(t.id);toast({title:"Silindi"});}catch{toast({title:"Hata",variant:"destructive"});}}} />)}</CatGroup>}
                {cMod.length>0&&<CatGroup emoji="📖" title="Diger Tamamlananlar" color={COLORS[4]} count={cMod.length} open={false}>{cMod.map(mt=><ModRow key={mt.id} task={mt} assignee={ga(mt.assigneeId)} />)}</CatGroup>}
                {ct.length===0&&cMod.length===0&&<div className="text-center py-20"><div className="text-6xl mb-4">💤</div><p className="text-xl font-black">Henuz biten yok</p><p className="text-sm text-slate-500 mt-2">Tamamlananlar burada gorunur.</p></div>}
              </>
            )}
          </div>
        )}

        {tab === "habits" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {habits.length > 0 ? habits.map((h,i) => (
              <HabitTrackerCard key={h.id} task={h} assignee={ga(h.assigneeId)}
                onToggleDay={(day,ic)=>updateHabitCompletion(h.id,day,ic).catch(()=>toast({title:"Hata",variant:"destructive"}))}
                onEdit={()=>{setEditTask(h);setFormOpen(true);}}
                onDelete={async()=>{try{await deleteTask(h.id);}catch{toast({title:"Hata",variant:"destructive"});}}}
                colorClass={HC[i%HC.length]} />
            )) : <div className="text-center py-20"><div className="text-6xl mb-4">🔥</div><p className="text-xl font-black">Aliskanlik Edin</p><p className="text-sm text-slate-500 mt-2">Zinciri kirmadan devam edecek hedefler ekle.</p></div>}
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-slate-900 dark:text-white">Liderlik Tablosu</h3>
          </div>
          <div className="p-3 space-y-1">
            {[...familyMembers].sort((a,b)=>b.xp-a.xp).map((m,i)=>(
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                <span className={cn("w-7 h-7 rounded-full flex items-center justify-center font-black text-xs", i===0?"bg-amber-400 text-white":i===1?"bg-slate-300 text-slate-700":i===2?"bg-orange-300 text-white":"bg-slate-100 dark:bg-slate-800 text-slate-500")}>{i+1}</span>
                <Avatar className="w-8 h-8 border-2 border-white dark:border-slate-700">
                  <AvatarImage src={m.avatar} />
                  <AvatarFallback style={{backgroundColor:m.color}} className="text-white text-xs font-bold">{m.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate text-slate-900 dark:text-white">{m.name}</p><p className="text-[10px] text-slate-400 font-medium">Seviye {m.level}</p></div>
                <span className="font-black text-sm text-amber-500">⭐ {m.xp.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={()=>{setEditTask(null);setFormOpen(true);}} className="fixed bottom-24 right-5 md:bottom-8 z-50 w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-500/30 flex items-center justify-center active:scale-95 transition-all hover:bg-indigo-700 hover:scale-105"><Plus className="w-7 h-7" /></button>

      {formOpen && (
        <div className="fixed inset-x-0 top-0 bottom-16 sm:inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={()=>setFormOpen(false)} />
          <div className={cn("relative w-full sm:max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden","animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300","rounded-t-[2.5rem] sm:rounded-[2rem] max-h-full sm:max-h-[90vh] sm:shadow-2xl")}>
            <div className="flex justify-center pt-4 pb-1 sm:hidden"><div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" /></div>
            <div className="flex items-center justify-between px-6 pt-4 pb-4 sm:pt-6 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg">{editTask?<LayoutGrid className="w-5 h-5 text-white"/>:<Target className="w-5 h-5 text-white"/>}</div>
                <div><h2 className="text-xl font-black">{editTask?"Gorevi Duzenle":"Yeni Gorev"}</h2><p className="text-xs text-slate-500 mt-0.5">{editTask?"Mevcut gorevi guncelle":"Aile icin yeni hedef ekle"}</p></div>
              </div>
              <button onClick={()=>setFormOpen(false)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4 overscroll-contain">
              <NewTaskForm familyMembers={familyMembers} onTaskProcessed={()=>setFormOpen(false)} taskToEdit={editTask} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
