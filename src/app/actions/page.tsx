"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, Mic, Send, Trash2, Pause, Play, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { transcribeAudio } from '@/ai/flows/speech-to-text-flow';
import { analyzePhoto } from '@/ai/flows/photo-analysis-flow';
import { Textarea } from '@/components/ui/textarea';

type Mode = 'camera' | 'video' | 'audio';

export default function ActionsPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('camera');
  const [hasPermission, setHasPermission] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [transcribing, setTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);


  const getPermissions = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setHasPermission(false);
      toast({
        variant: 'destructive',
        title: 'Erişim Reddedildi',
        description: 'Kamera ve mikrofon izinlerini tarayıcı ayarlarından etkinleştirin.',
      });
    }
  };
  
  useEffect(() => {
    getPermissions();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setPhoto(null);
    setAudioUrl(null);
    setTranscribedText("");
    setAnalysisResult(null);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/png');
      setPhoto(dataUrl);
      setAnalysisResult(null);
    }
  };
  
  const handleAnalyzePhoto = async () => {
    if (!photo) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await analyzePhoto(photo);
      setAnalysisResult(result.analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({ variant: "destructive", title: "Analiz Başarısız Oldu", description: "Lütfen tekrar deneyin." });
    } finally {
      setAnalyzing(false);
    }
  };


  const startRecording = () => {
    if (stream) {
      setIsRecording(true);
      const mediaRecorder = new MediaRecorder(stream);
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
  
  const handleTranscribe = async () => {
      if (!audioUrl) return;
      setTranscribing(true);
      setTranscribedText("");
      try {
          const audioBlob = await fetch(audioUrl).then(r => r.blob());
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              const result = await transcribeAudio(base64Audio);
              setTranscribedText(result.text);
          };
      } catch (error) {
          console.error("Transcription error:", error);
          toast({ variant: "destructive", title: "Metne Çevirme Başarısız Oldu", description: "Lütfen tekrar deneyin." });
      } finally {
          setTranscribing(false);
      }
  };


  const renderContent = () => {
    if (!hasPermission) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Kamera ve Mikrofon Erişimi Gerekli</AlertTitle>
          <AlertDescription>
            Bu özelliği kullanmak için lütfen tarayıcı ayarlarından kamera ve mikrofon erişimine izin verin.
          </AlertDescription>
        </Alert>
      );
    }

    switch (mode) {
      case 'camera':
        return (
          <div className="flex flex-col items-center gap-4 w-full max-w-md">
            <div className="w-full aspect-video rounded-lg overflow-hidden border bg-black relative">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline style={{ display: photo ? 'none' : 'block' }}/>
              {photo && <img src={photo} alt="Captured" className="absolute inset-0 w-full h-full object-cover"/>}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {photo ? (
              <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setPhoto(null); setAnalysisResult(null); }}>
                        <Trash2 className="mr-2"/> Tekrar Çek
                    </Button>
                    <Button onClick={handleAnalyzePhoto} disabled={analyzing}>
                      {analyzing ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2"/>}
                      {analyzing ? "Analiz Ediliyor..." : "Fotoğrafı Analiz Et"}
                    </Button>
                  </div>
                   {analysisResult && (
                    <Card className="w-full">
                        <CardHeader><CardTitle>AI Analiz Sonucu</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-sm">{analysisResult}</p>
                        </CardContent>
                    </Card>
                )}
              </div>
            ) : (
              <Button onClick={takePhoto} size="lg" className="rounded-full w-20 h-20">
                <Camera size={32}/>
              </Button>
            )}
          </div>
        );
      case 'video':
         return (
          <div className="flex flex-col items-center gap-4">
             <div className="w-full max-w-md aspect-video rounded-lg overflow-hidden border bg-black">
                <video ref={videoRef} className="w-full h-full" autoPlay muted playsInline />
            </div>
            <Button size="lg" className="rounded-full w-20 h-20 bg-red-500 hover:bg-red-600">
                <Video size={32}/>
            </Button>
             <p className="text-muted-foreground text-sm">Video kaydı yakında...</p>
          </div>
        );
      case 'audio':
        return (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
                {audioUrl ? (
                    <div className="w-full space-y-4">
                        <audio src={audioUrl} controls className="w-full"/>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => { setAudioUrl(null); setAudioChunks([]); setTranscribedText(""); }}>
                                <Trash2 className="mr-2"/> Sil ve Yeniden Kaydet
                            </Button>
                            <Button onClick={handleTranscribe} disabled={transcribing}>
                                {transcribing ? <Loader2 className="mr-2 animate-spin"/> : <Mic className="mr-2"/>}
                                {transcribing ? "Çevriliyor..." : "Metne Çevir"}
                            </Button>
                        </div>
                        {transcribedText && (
                            <Card>
                                <CardHeader><CardTitle>Metin Çıktısı</CardTitle></CardHeader>
                                <CardContent>
                                    <Textarea value={transcribedText} readOnly rows={5} />
                                </CardContent>
                            </Card>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-5xl font-bold text-primary animate-pulse">{isRecording ? "KAYDEDİLİYOR" : "HAZIR"}</div>
                        <p className="text-muted-foreground">Sesli not kaydetmek için butona basın.</p>
                        <Button onClick={isRecording ? stopRecording : startRecording} size="lg" className="rounded-full w-20 h-20 bg-blue-500 hover:bg-blue-600">
                           {isRecording ? <Pause size={32} /> : <Mic size={32}/>}
                        </Button>
                    </div>
                )}
            </div>
        )
    }
  };

  return (
    <>
      <PageHeader title="Hızlı İşlemler ⚡️" />
      <Card>
        <CardHeader>
          <div className="flex justify-center gap-2 border-b pb-4">
            <Button variant={mode === 'camera' ? 'default' : 'outline'} onClick={() => handleModeChange('camera')}><Camera className="mr-2"/> Fotoğraf Çek & Analiz Et</Button>
            <Button variant={mode === 'video' ? 'default' : 'outline'} onClick={() => handleModeChange('video')}><Video className="mr-2"/> Video Kaydet</Button>
            <Button variant={mode === 'audio' ? 'default' : 'outline'} onClick={() => handleModeChange('audio')}><Mic className="mr-2"/> Ses Kaydet</Button>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center min-h-[400px]">
          {renderContent()}
        </CardContent>
      </Card>
    </>
  );
}
