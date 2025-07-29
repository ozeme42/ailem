
"use client";

import React, { useState } from 'react';
import { Note, NoteContentBlock } from '@/lib/data';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Image as ImageIcon, Trash2, Mic } from 'lucide-react';
import Image from 'next/image';
import { migrateImage } from '@/ai/flows/migrate-image-flow';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


interface NoteEditorProps {
  initialNote: Note | null;
  onSave: (data: Partial<Note>) => void;
  onCancel: () => void;
}

export function NoteEditor({ initialNote, onSave, onCancel }: NoteEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<NoteContentBlock[]>(initialNote?.content || [{ id: Date.now().toString(), type: 'text', data: '' }]);
  const [title, setTitle] = useState(initialNote?.title || '');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const addBlock = (type: 'text' | 'image') => {
    if (type === 'image') {
      fileInputRef.current?.click();
    } else {
      setBlocks([...blocks, { id: Date.now().toString(), type, data: '' }]);
    }
  };

  const updateBlock = (id: string, data: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && user) {
          setIsLoading(true);
          toast({ title: 'Görsel yükleniyor...' });
          try {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = async () => {
                  const dataUri = reader.result as string;
                  const destinationPath = `note-images/${user.uid}-${Date.now()}`;
                  const result = await migrateImage({ imageDataUri: dataUri, destinationPath });
                  if (result.success && result.newUrl) {
                      setBlocks([...blocks, { id: Date.now().toString(), type: 'image', data: result.newUrl }]);
                      toast({ title: 'Görsel Yüklendi' });
                  } else {
                      throw new Error(result.error || 'Görsel yüklenemedi.');
                  }
                  setIsLoading(false);
              };
          } catch (error: any) {
              toast({ title: 'Hata', description: error.message, variant: 'destructive' });
              setIsLoading(false);
          }
      }
  }

  const handleSave = () => {
    onSave({ title, content: blocks });
  };
  
  const noteColorClass = initialNote?.color || 'bg-yellow-100 border-yellow-200';

  return (
    <div className={cn("flex flex-col h-full rounded-lg p-4", noteColorClass)}>
      <Input
        placeholder="Not Başlığı"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="text-2xl font-bold border-0 shadow-none focus-visible:ring-0 px-2 mb-2 bg-transparent placeholder:text-muted-foreground/80"
      />
      <ScrollArea className="flex-grow bg-background/50 rounded-md p-2">
        <div className="space-y-4">
          {blocks.map(block => (
            <div key={block.id} className="group relative">
                {block.type === 'text' && (
                <Textarea
                    placeholder="Yazmaya başla..."
                    value={block.data}
                    onChange={e => updateBlock(block.id, e.target.value)}
                    className="min-h-[120px] text-base bg-transparent border-0 focus-visible:ring-0"
                />
                )}
                 {block.type === 'image' && (
                    <div className="relative">
                        <Image src={block.data} alt="Not içeriği" width={500} height={300} className="rounded-md object-cover w-full h-auto" data-ai-hint="note image" />
                    </div>
                )}
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeBlock(block.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
       <div className="flex-shrink-0 pt-4 flex justify-between items-center">
            <div>
                 <Button variant="ghost" size="sm" onClick={() => addBlock('text')}><PlusCircle className="mr-2 h-4 w-4"/> Metin</Button>
                 <Button variant="ghost" size="sm" onClick={() => addBlock('image')}><ImageIcon className="mr-2 h-4 w-4"/> Resim</Button>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={onCancel}>İptal</Button>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                    Kaydet
                </Button>
            </div>
       </div>
    </div>
  );
}
