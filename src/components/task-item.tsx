"use client";

import * as React from "react";
import Image from "next/image";
import { Star, GripVertical, ChevronDown, Paperclip, Mic, Pause, Play, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Task, FamilyMember, Subtask } from "@/lib/data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface TaskItemProps {
  task: Task;
  assignee: FamilyMember;
}

const AudioRecorder: React.FC<{ onSave: (audioUrl: string) => void; onCancel: () => void }> = ({ onSave, onCancel }) => {
    const [isRecording, setIsRecording] = React.useState(false);
    const [audioChunks, setAudioChunks] = React.useState<Blob[]>([]);
    const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const streamRef = React.useRef<MediaStream | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const getMicPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            } catch (err) {
                toast({
                    variant: 'destructive',
                    title: 'Mikrofon Erişimi Reddedildi',
                    description: 'Sesli not kaydetmek için mikrofon izni vermelisiniz.',
                });
                onCancel();
            }
        };
        getMicPermission();

        return () => {
             streamRef.current?.getTracks().forEach(track => track.stop());
        }
    }, [onCancel, toast]);
    
    const startRecording = () => {
        if (streamRef.current) {
            setIsRecording(true);
            setAudioUrl(null);
            setAudioChunks([]);
            const mediaRecorder = new MediaRecorder(streamRef.current);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                setAudioChunks((prev) => [...prev, event.data]);
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
            };
            mediaRecorder.start();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSave = () => {
        if(audioUrl) {
            onSave(audioUrl);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center gap-6 p-4">
            {!audioUrl ? (
                <>
                    <div className="text-xl font-bold text-primary animate-pulse">{isRecording ? "KAYDEDİLİYOR..." : "KAYDA HAZIR"}</div>
                    <Button onClick={isRecording ? stopRecording : startRecording} size="lg" className="rounded-full w-24 h-24 bg-blue-500 hover:bg-blue-600 text-white">
                        {isRecording ? <Pause size={48} /> : <Mic size={48}/>}
                    </Button>
                    <p className="text-muted-foreground text-sm text-center">Notunuzu kaydetmek için butona basın. <br/> Durdurmak için tekrar basın.</p>
                </>
            ) : (
                <div className="w-full space-y-4">
                    <p className="text-center font-semibold">Kaydınız</p>
                    <audio src={audioUrl} controls className="w-full"/>
                    <div className="flex justify-center gap-2">
                        <Button variant="outline" onClick={() => { setAudioUrl(null); setAudioChunks([]); }}>
                            <Trash2 className="mr-2"/> Yeniden Kaydet
                        </Button>
                        <Button onClick={handleSave}>Kaydet</Button>
                    </div>
                </div>
            )}
        </div>
    );
};


export function TaskItem({ task, assignee }: TaskItemProps) {
  const [isCompleted, setIsCompleted] = React.useState(task.completed);
  const [subtasks, setSubtasks] = React.useState<Subtask[]>(task.subtasks);
  const [audioNoteUrl, setAudioNoteUrl] = React.useState<string | undefined>(task.audioNoteUrl);
  const [isAudioModalOpen, setIsAudioModalOpen] = React.useState(false);
  const { toast } = useToast();

  const handleCompletion = () => {
    const newCompletionState = !isCompleted;
    setIsCompleted(newCompletionState);
    if (newCompletionState) {
      toast({
        title: "🎉 Görev Tamamlandı!",
        description: `Harika iş, ${assignee.name}! ${task.points} XP kazandın.`,
      });
      // Mark all subtasks as completed
      setSubtasks(subtasks.map(st => ({ ...st, completed: true })));
    }
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    const newSubtasks = subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(newSubtasks);

    // Check if all subtasks are completed to complete the main task
    if (newSubtasks.every(st => st.completed)) {
        if (!isCompleted) {
            setIsCompleted(true);
            toast({
                title: "🎉 Görev Tamamlandı!",
                description: `Harika iş, ${assignee.name}! ${task.points} XP kazandın.`,
            });
        }
    } else {
        if (isCompleted) {
            setIsCompleted(false);
        }
    }
  };

  const handleSaveAudio = (url: string) => {
      setAudioNoteUrl(url);
      setIsAudioModalOpen(false);
      toast({ title: "Sesli Not Kaydedildi", description: "Sesli notunuz göreve başarıyla eklendi." });
  }

  const handleDeleteAudio = () => {
      setAudioNoteUrl(undefined);
      toast({ title: "Sesli Not Silindi", variant: "destructive" });
  }


  const completedSubtasks = subtasks.filter(st => st.completed).length;
  const progress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : (isCompleted ? 100 : 0);


  const difficultyColors = {
    Kolay: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400',
    Orta: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    Zor: 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400',
  }

  return (
    <Collapsible>
      <Card className={`transition-all duration-300 ${isCompleted ? 'bg-muted/50 border-dashed' : 'bg-card hover:shadow-md'}`}>
        <CardContent className="p-4 flex items-center gap-4">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
          <Checkbox
            id={`task-${task.id}`}
            checked={isCompleted}
            onCheckedChange={handleCompletion}
            className="h-5 w-5 shrink-0"
          />
          <div className="flex-grow">
            <label
              htmlFor={`task-${task.id}`}
              className={`font-medium transition-colors cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
              {task.title}
            </label>
            <p className="text-xs text-muted-foreground">{task.dueDate}</p>
             {subtasks.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={progress} className="h-1 w-24" />
                    <span className="text-xs text-muted-foreground">{completedSubtasks}/{subtasks.length}</span>
                </div>
            )}
          </div>
          <Badge variant="outline" className={`hidden sm:flex ${difficultyColors[task.difficulty]}`}>{task.difficulty}</Badge>
          <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5 text-sm">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
            <span className="font-bold">{task.points}</span>
          </Badge>
          <div className="flex items-center gap-2 shrink-0">
            <Image
              src={assignee.avatar}
              alt={assignee.name}
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-sm font-medium hidden md:inline">{assignee.name}</span>
          </div>
          {(task.subtasks.length > 0 || task.notes || task.photo || audioNoteUrl) && (
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </Button>
            </CollapsibleTrigger>
          )}
        </CardContent>
        {(task.subtasks.length > 0 || task.notes || task.photo || audioNoteUrl) && (
            <CollapsibleContent>
                 <div className="px-4 pb-4 ml-14 border-t pt-4 mt-2 space-y-4">
                    {subtasks.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2 text-sm">Alt Görevler</h4>
                            <div className="space-y-2">
                            {subtasks.map(subtask => (
                                <div key={subtask.id} className="flex items-center gap-3">
                                    <Checkbox 
                                        id={`subtask-${subtask.id}`} 
                                        checked={subtask.completed}
                                        onCheckedChange={() => handleSubtaskToggle(subtask.id)}
                                    />
                                    <label htmlFor={`subtask-${subtask.id}`} className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {subtask.title}
                                    </label>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                    {audioNoteUrl && (
                        <div>
                             <h4 className="font-semibold mb-2 text-sm">Sesli Not</h4>
                             <div className="flex items-center gap-2">
                                <audio src={audioNoteUrl} controls className="w-full max-w-xs" />
                                <Button variant="destructive" size="icon" onClick={handleDeleteAudio}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             </div>
                        </div>
                    )}
                     <div className="flex gap-2">
                        <Button variant="outline" size="sm"><Paperclip className="mr-2 h-4 w-4"/> Dosya Ekle</Button>
                        <Dialog open={isAudioModalOpen} onOpenChange={setIsAudioModalOpen}>
                          <DialogTrigger asChild>
                             <Button variant="outline" size="sm"><Mic className="mr-2 h-4 w-4"/> {audioNoteUrl ? 'Notu Değiştir' : 'Sesli Not Ekle'}</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sesli Not Kaydet</DialogTitle>
                              <DialogDescription>
                                Bu görev için bir sesli not kaydedin.
                              </DialogDescription>
                            </DialogHeader>
                            <AudioRecorder onSave={handleSaveAudio} onCancel={() => setIsAudioModalOpen(false)} />
                          </DialogContent>
                        </Dialog>
                    </div>
                 </div>
            </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}
