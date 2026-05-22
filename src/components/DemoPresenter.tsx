import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Play, Square, Volume2, Mic, Activity, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Card } from './ui/card';

const presentationSteps = [
  {
    route: '/',
    title: 'Mission Control',
    audioFile: '/audio/scene_1.mp3',
    fallbackDelay: 8000,
    text: "Welcome to NAGA-NODE. This is the primary command center for offline, decentralized rural finance in Ethiopia. Notice the system tracks network liquidity, transaction mass, and active Ghost Sync streams in real-time."
  },
  {
    route: '/kiosk',
    title: 'The Edge (Offline)',
    audioFile: '/audio/scene_2.mp3',
    fallbackDelay: 10000,
    text: "This is the Agent Kiosk. It operates completely disconnected from the internet. Local agents can accept physical cash and cryptographically secure transactions using local hardware and AES-256 encryption."
  },
  {
    route: '/data-mule',
    title: 'Data Mule Bridge',
    audioFile: '/audio/scene_3.mp3',
    fallbackDelay: 9000,
    text: "To bridge the connectivity gap in zero-4G zones, we developed the Data Mule protocol. Encrypted receipts are ferried asynchronously via bluetooth by traveling supervisors toward the cellular grid."
  },
  {
    route: '/fmcg-liquidity',
    title: 'FMCG Liquidity',
    audioFile: '/audio/scene_4.mp3',
    fallbackDelay: 10000,
    text: "Here, agent float is physically backed by fast moving consumer goods. The algorithmic virtual ATM ensures suppliers get paid directly via escrow without transporting fragile fiat bundles."
  },
  {
    route: '/farmer-360',
    title: 'Farmer 360',
    audioFile: '/audio/scene_5.mp3',
    fallbackDelay: 10000,
    text: "At the individual level, Farmer 360 maps financial history. We use zero-knowledge proofs so operational health scores are generated locally without leaking personally identifiable information to the cloud."
  },
  {
    route: '/ardi-engine',
    title: 'Ardi Engine',
    audioFile: '/audio/scene_6.mp3',
    fallbackDelay: 12000,
    text: "The Ardi Scoring Engine mathematically calculates Node Grades and Liquidity Coverage Ratios locally. It issues offline credit limits to farmers based entirely on verified mathematical history and Equb trust scores."
  },
  {
    route: '/node-status',
    title: 'Sovereign Core',
    audioFile: '/audio/scene_7.mp3',
    fallbackDelay: 12000,
    text: "Ultimately, all data is settled securely here at the Sovereign Node, physically located in the Raxio Tier Three Data Center in Addis Ababa. Complete offline resilience, with absolute data sovereignty. Thank you for viewing."
  },
  {
    route: '/',
    title: 'Conclusion',
    audioFile: '/audio/scene_8.mp3',
    fallbackDelay: 5000,
    text: "This concludes the automated presentation. You may now explore the platform freely."
  }
];

export default function DemoPresenter() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  
  const isPlayingRef = useRef(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prep voices
    window.speechSynthesis.getVoices();
    
    return () => {
      window.speechSynthesis.cancel();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, []);

  const stopPresentation = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    toast.info("Auto-Pilot presentation cancelled.");
  };

  const togglePause = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const startPresentation = () => {
    // Browsers require a user gesture to start Audio/Speech
    window.speechSynthesis.cancel(); 
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentStep(0);
    toast.success("Presentation Started. Please listen.");
    setIsExpanded(false); // Auto-minimize upon start
    executeStep(0);
  };

  const executeStep = (index: number) => {
    if (!isPlayingRef.current) return;
    
    if (index >= presentationSteps.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }
    
    setCurrentStep(index);
    const step = presentationSteps[index];
    
    // Navigate first
    navigate(step.route);
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(step.text);
    utterance.rate = 0.92; // Slightly paced
    utterance.pitch = 1.0;
    
    // Best effort to get a high quality voice
    const setVoiceAndSpeak = () => {
      if (!isPlayingRef.current) return;
      const voices = window.speechSynthesis.getVoices();
      
      // Prefer Google US English or standard generic English
      let preferredVoice = voices.find(v => v.name.includes('Google US English'));
      if (!preferredVoice) preferredVoice = voices.find(v => v.lang.startsWith('en-'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        // Pause for 1.5 seconds before moving to the next slide
        timeoutRef.current = setTimeout(() => {
          executeStep(index + 1);
        }, 1500);
      };

      utterance.onerror = (e) => {
        // Fallback for TTS errors (e.g., interrupted, not supported voice)
        console.warn("Speech synthesis error", e);
        if (!isPlayingRef.current) return;
        timeoutRef.current = setTimeout(() => {
          executeStep(index + 1);
        }, 4000);
      };
      
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Wait a brief moment for the page transition visually before speaking
    timeoutRef.current = setTimeout(setVoiceAndSpeak, 1200);
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
         <Button 
           onClick={() => setIsExpanded(true)} 
           className="rounded-full w-14 h-14 bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/50"
         >
           <Bot className="w-6 h-6 text-white" />
         </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 animate-in slide-in-from-bottom-8 fade-in">
      <Card className="bg-slate-900 border-indigo-500/30 shadow-2xl overflow-hidden backdrop-blur-xl">
         <div className="bg-indigo-600/10 border-b border-indigo-500/20 p-3 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(false)}>
            <div className="flex items-center gap-2">
               <Bot className="w-5 h-5 text-indigo-400" />
               <span className="font-bold text-sm tracking-widest uppercase text-indigo-300">Auto-Presenter</span>
            </div>
            {isPlaying && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
         </div>
         
         <div className="p-4">
            {isPlaying ? (
               <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Current Scene ({currentStep + 1}/{presentationSteps.length})</p>
                    <p className="text-sm font-medium text-emerald-400">{presentationSteps[currentStep].title}</p>
                  </div>
                  <div className="h-20 bg-slate-950 rounded-md border border-slate-800 p-2 overflow-y-auto">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                       "{presentationSteps[currentStep].text}"
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={togglePause} variant="outline" className="w-1/2 font-bold uppercase tracking-widest text-xs h-10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-950">
                       {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                       {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button onClick={stopPresentation} variant="destructive" className="w-1/2 font-bold uppercase tracking-widest text-xs h-10">
                       <Square className="w-4 h-4 mr-2" /> Stop Demo
                    </Button>
                  </div>
               </div>
            ) : (
               <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed text-center">
                     Take a guided, voice-narrated architectural tour of the system.
                  </p>
                  <Button onClick={startPresentation} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-xs h-12 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                     <Play className="w-4 h-4 mr-2" /> Start 7-Min Tour
                  </Button>
               </div>
            )}
         </div>
         
         {isPlaying && (
           <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
             <div 
               className="h-full bg-emerald-500 transition-all duration-500" 
               style={{ width: `${((currentStep) / presentationSteps.length) * 100}%` }}
             />
           </div>
         )}
      </Card>
    </div>
  );
}
