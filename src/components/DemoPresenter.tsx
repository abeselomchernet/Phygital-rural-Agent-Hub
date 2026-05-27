import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Play, Square, Volume2, Mic, Activity, Pause, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Card } from './ui/card';

const presentationSteps = [
  {
    route: '/',
    title: 'Mission Control',
    audioFile: '/audio/scene_1.mp3',
    fallbackDelay: 8000,
    text: "Hi there, and welcome. Let me give you a personal tour of Naga Node—our resilient, offline command center designed for rural finance. On this dashboard, you can see our live network liquidity, transaction mass, and active Ghost-Sync streams updating in real-time."
  },
  {
    route: '/kiosk',
    title: 'The Edge (Offline)',
    audioFile: '/audio/scene_2.mp3',
    fallbackDelay: 10000,
    text: "Now, let's step out onto the edge. This is the rural Kiosk. Out here, deep in the field, there is absolutely no internet. Local agents accept physical cash deposits and securely record cryptographic ledger entries locally, leveraging device storage and mathematical trust."
  },
  {
    route: '/data-mule',
    title: 'Data Mule Bridge',
    audioFile: '/audio/scene_3.mp3',
    fallbackDelay: 9000,
    text: "But how does this data get back to civilization? That’s where our Data Mule protocol comes in. Traveling supervisors act as physical packets, syncing locally with kiosks via Bluetooth or local Wi-Fi hotspots, and carrying that ledger state back toward the cellular grid."
  },
  {
    route: '/fmcg-liquidity',
    title: 'FMCG Liquidity',
    audioFile: '/audio/scene_4.mp3',
    fallbackDelay: 10000,
    text: "To keep cash flowing without physical vault escrows, we backed agent float with fast-moving consumer goods. The FMCG Liquidity pane connects local merchants directly, turning daily inventory shipments into virtual A-T-M balances safely backed by smart escrows."
  },
  {
    route: '/farmer-360',
    title: 'Farmer 360',
    audioFile: '/audio/scene_5.mp3',
    fallbackDelay: 10000,
    text: "At the individual farmer level, we hold a holistic view. In our Farmer Three-Sixty portal, we verify identity using biometric card integrity matching, keeping records entirely encrypted. Operational scores are compiled locally, protecting privacy with Zero-Knowledge principles."
  },
  {
    route: '/ardi-engine',
    title: 'Ardi Engine',
    audioFile: '/audio/scene_6.mp3',
    fallbackDelay: 12000,
    text: "Deep under the hood lies the Ardi credit scoring engine. It analyzes historical behaviors, Node Grades, and Equb savings circles down to an offline rating. It automatically issues dynamic credit lines directly in local currency, opening financial horizons without a standard bank."
  },
  {
    route: '/node-status',
    title: 'Sovereign Core',
    audioFile: '/audio/scene_7.mp3',
    fallbackDelay: 12000,
    text: "And finally, we settle everything here at the Sovereign Core, housed in the secure Raxio Tier Three Data Center in Addis Ababa. Complete offline autonomy, paired with resilient digital sovereignty. I hope this tour gave you a feel for how we bridge the digital divide."
  },
  {
    route: '/',
    title: 'Conclusion',
    audioFile: '/audio/scene_8.mp3',
    fallbackDelay: 5000,
    text: "And that brings our journey to a close. Feel free to explore the active panels, trigger a sample transaction, or configure the sync settings on your own. Thank you for your time."
  }
];

export default function DemoPresenter() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [rate, setRate] = useState<number>(0.92);
  const [showVoiceConfig, setShowVoiceConfig] = useState(false);
  
  const isPlayingRef = useRef(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load and subscribe to speech voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Attempt premium / natural pre-selection
      if (availableVoices.length > 0 && !selectedVoiceName) {
        // Natural/neural/online preference filter
        const preferred = availableVoices.find(v => 
          v.lang.startsWith('en') && 
          ['natural', 'neural', 'online', 'google us english', 'samantha', 'aria', 'daniel'].some(keyword => 
            v.name.toLowerCase().includes(keyword)
          )
        ) || availableVoices.find(v => v.lang.startsWith('en'));
        
        if (preferred) {
          setSelectedVoiceName(preferred.name);
        }
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [selectedVoiceName]);

  const stopPresentation = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    window.speechSynthesis.cancel();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    toast.info("Auto-Pilot presentation stopped.");
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
    window.speechSynthesis.cancel(); 
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentStep(0);
    toast.success("Guided voice-narrated presentation initialized!");
    setIsExpanded(false); // Auto-minimize upon start
    executeStep(0);
  };

  const executeStep = (index: number) => {
    if (!isPlayingRef.current) return;
    
    if (index >= presentationSteps.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      toast.success("Architectural tour completed successfully!");
      return;
    }
    
    setCurrentStep(index);
    const step = presentationSteps[index];
    
    // Navigate first
    navigate(step.route);
    
    // Create new utterance with humanized script text details
    const utterance = new SpeechSynthesisUtterance(step.text);
    utterance.rate = rate; 
    utterance.pitch = 1.0;
    
    const setVoiceAndSpeak = () => {
      if (!isPlayingRef.current) return;
      const allVoices = window.speechSynthesis.getVoices();
      
      // Select the user-configured or fallback voice
      let selectedVoice = allVoices.find(v => v.name === selectedVoiceName);
      if (!selectedVoice) {
        selectedVoice = allVoices.find(v => v.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        // Pause gracefully for 1.8 seconds between pages to simulate normal speaking cadence
        timeoutRef.current = setTimeout(() => {
          executeStep(index + 1);
        }, 1800);
      };

      utterance.onerror = (e) => {
        console.warn("Speech synthesis pacing issue or interrupt:", e);
        if (!isPlayingRef.current) return;
        timeoutRef.current = setTimeout(() => {
          executeStep(index + 1);
        }, 4000);
      };
      
      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    // Wait 1.3 seconds for page transition state to settle before human voice speaks
    timeoutRef.current = setTimeout(setVoiceAndSpeak, 1300);
  };

  const handleTestVoice = () => {
    window.speechSynthesis.cancel();
    const testUtterance = new SpeechSynthesisUtterance("Testing natural voice cadence configuration. Sounds good!");
    testUtterance.rate = rate;
    const allVoices = window.speechSynthesis.getVoices();
    const selectedVoice = allVoices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) testUtterance.voice = selectedVoice;
    window.speechSynthesis.speak(testUtterance);
    toast.success("Playing sample audio test!");
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2">
         {isPlaying && (
           <div className="bg-slate-900/90 text-white border border-indigo-500/40 px-3.5 py-2.5 rounded-full flex items-center gap-2 text-xs font-mono shadow-2xl backdrop-blur">
             <Radio className="w-3.5 h-3.5 text-rose-500 animate-ping" />
             <span className="font-bold text-slate-350">{presentationSteps[currentStep].title}</span>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           </div>
         )}
         <Button 
           onClick={() => setIsExpanded(true)} 
           className="rounded-full w-14 h-14 bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/50 transition-transform hover:scale-110"
         >
           <Bot className="w-6 h-6 text-white" />
         </Button>
      </div>
    );
  }

  const enUsVoices = voices.filter(v => v.lang.startsWith('en'));

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 animate-in slide-in-from-bottom-8 fade-in">
      <Card className="bg-slate-900 border border-indigo-500/30 shadow-2xl overflow-hidden backdrop-blur-xl">
         <div className="bg-indigo-600/10 border-b border-indigo-500/20 p-3 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(false)}>
            <div className="flex items-center gap-2">
               <Bot className="w-5 h-5 text-indigo-400" />
               <span className="font-bold text-xs tracking-widest uppercase text-indigo-300">Naga Node Presenter</span>
            </div>
            {isPlaying && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
         </div>
         
         <div className="p-4 space-y-3.5">
            {isPlaying ? (
               <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        SCENE {currentStep + 1} OF {presentationSteps.length}
                      </span>
                      <span className="text-[10px] text-indigo-400 font-mono">
                        Speed: {rate}x
                      </span>
                    </div>
                    <p className="text-sm font-black text-rose-400 tracking-wider font-mono uppercase">{presentationSteps[currentStep].title}</p>
                  </div>
                  <div className="h-24 bg-slate-950 rounded-lg border border-slate-850 p-3 overflow-y-auto">
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans font-medium">
                       "{presentationSteps[currentStep].text}"
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={togglePause} variant="outline" className="w-1/2 font-bold uppercase tracking-widest text-xs h-9 border-indigo-500/20 text-indigo-300 hover:bg-slate-800">
                       {isPaused ? <Play className="w-3.5 h-3.5 mr-1" /> : <Pause className="w-3.5 h-3.5 mr-1" />}
                       {isPaused ? "Resume" : "Pause"}
                    </Button>
                    <Button onClick={stopPresentation} variant="destructive" className="w-1/2 font-bold uppercase tracking-widest text-[10px] h-9">
                       <Square className="w-3.5 h-3.5 mr-1" /> Terminate
                    </Button>
                  </div>
               </div>
            ) : (
               <div className="space-y-3.5">
                  <p className="text-xs text-slate-350 leading-relaxed text-center font-medium">
                     Experience a guided, humanized voice explanation of the Sovereign Naga Node systems.
                  </p>

                  {/* Narration voice options */}
                  <div className="border border-slate-800 rounded-lg p-2.5 bg-slate-950/60">
                    <button 
                      onClick={() => setShowVoiceConfig(!showVoiceConfig)}
                      className="flex items-center justify-between w-full text-[11px] font-bold text-indigo-300 font-mono uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" /> Configure Voice Cadence
                      </span>
                      {showVoiceConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {showVoiceConfig && (
                      <div className="pt-2.5 space-y-2.5 border-t border-slate-900 mt-2 animate-fade-in text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-mono font-bold block">SELECT VOICE INTERFACE:</label>
                          <select
                            value={selectedVoiceName}
                            onChange={(e) => setSelectedVoiceName(e.target.value)}
                            className="bg-slate-900 text-white font-mono text-[10px] p-1.5 rounded border border-slate-800 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {enUsVoices.map(v => (
                              <option key={v.name} value={v.name}>
                                {v.name.replace('Microsoft', 'MS').replace('Google', 'GOOG')}
                              </option>
                            ))}
                            {enUsVoices.length === 0 && <option>Default Native voice</option>}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">RATE (SPEED):</span>
                            <span className="text-indigo-400 font-bold">{rate}x</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[0.8, 0.88, 0.92, 1.0, 1.1].map(val => (
                              <button
                                key={val}
                                onClick={() => setRate(val)}
                                className={`py-1 text-[9px] font-mono font-bold rounded ${
                                  rate === val ? 'bg-indigo-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-slate-400'
                                }`}
                              >
                                {val}x
                              </button>
                            ))}
                          </div>
                        </div>

                        <Button 
                          onClick={handleTestVoice}
                          variant="outline"
                          size="sm"
                          className="w-full text-[10px] bg-slate-900/50 border-slate-800 text-indigo-300"
                        >
                          <Volume2 className="w-3 h-3 mr-1" /> Test Voice settings
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button onClick={startPresentation} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold uppercase tracking-wider text-[11px] h-11 shadow-[0_0_15px_rgba(79,70,229,0.25)]">
                     <Play className="w-3.5 h-3.5 mr-1" /> Launch Guided Audio Tour
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

