import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Settings, Download, Loader2, Play, Square, Activity, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function LiveTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support the Web Speech API. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Could be selectable

    recognition.onresult = (event: any) => {
      let finalTranscriptChunk = '';
      let interimTranscriptChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript + ' ';
        } else {
          interimTranscriptChunk += event.results[i][0].transcript;
        }
      }

      setTranscript((prev) => prev + finalTranscriptChunk);
      setInterimTranscript(interimTranscriptChunk);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please allow microphone permissions.");
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are supposed to be listening (handling timeouts)
      if (isListening && recognitionRef.current) {
         try {
           recognitionRef.current.start();
         } catch (e) {
           console.log("Could not restart automatically");
         }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const toggleListening = () => {
    if (error && error.includes("browser does not support")) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      toast.info("Transcription paused");
    } else {
      try {
        setError(null);
        recognitionRef.current?.start();
        setIsListening(true);
        toast.success("Live transcription started");
      } catch (err) {
        console.error("Error starting recognition:", err);
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    toast.success("Transcript cleared");
  };

  const downloadTranscript = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcription-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center">
            <Volume2 className="mr-3 w-8 h-8 text-indigo-500" /> Live Transcription
          </h1>
          <p className="text-slate-400 mt-2">Real-time voice-to-text processing for agent meetings and documentation.</p>
        </div>
        <div className="flex items-center gap-3">
          {error ? (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 py-1.5 px-3">
                API Error
              </Badge>
          ) : isListening ? (
             <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 py-1.5 px-3 flex items-center animate-pulse">
                <Activity className="w-3.5 h-3.5 mr-2" /> Live Feed Active
             </Badge>
          ) : (
             <Badge variant="outline" className="bg-slate-800 text-slate-400 border-slate-700 py-1.5 px-3">
                Standby
             </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3">
          <Activity className="w-5 h-5 text-red-400" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative">
        <CardHeader className="bg-slate-800/30 border-b border-slate-800 flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-sm uppercase tracking-widest font-black text-slate-300">
               Audio Processing Feed
            </CardTitle>
            <div className="flex gap-2">
               <Button onClick={downloadTranscript} disabled={!transcript} variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" /> Export Log
               </Button>
               <Button onClick={clearTranscript} disabled={!transcript} variant="outline" size="sm" className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-red-400">
                  Clear
               </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto p-6 bg-slate-950 font-mono text-sm leading-relaxed">
            {!transcript && !interimTranscript && !isListening && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 py-20">
                <MicOff className="w-16 h-16 mb-4" />
                <p>No audio data captured.</p>
                <p>Press start to begin transcription.</p>
              </div>
            )}
            
            <p className="text-slate-300 whitespace-pre-wrap">{transcript}</p>
            {interimTranscript && (
              <span className="text-indigo-400 italic"> {interimTranscript}</span>
            )}
            
            {isListening && (
              <div className="mt-4 flex items-center text-emerald-500/50">
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 <span className="text-xs uppercase tracking-widest">Listening...</span>
              </div>
            )}
          </div>
          
          <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-between items-center">
             <div className="flex gap-2">
                <Button 
                   onClick={toggleListening} 
                   disabled={!!(error && error.includes("support"))}
                   className={`${isListening ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_15px_rgba(79,70,229,0.3)]'} text-white font-bold tracking-widest uppercase transition-all w-40`}
                >
                   {isListening ? (
                     <><Square className="w-4 h-4 mr-2" /> Stop feed</>
                   ) : (
                     <><Play className="w-4 h-4 mr-2" /> Start feed</>
                   )}
                </Button>
             </div>
             
             <div className="text-xs text-slate-500 uppercase tracking-widest flex items-center">
                <Settings className="w-3.5 h-3.5 mr-2" />
                Language: Default (EN-US)
             </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
