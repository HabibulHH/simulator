import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CONSTANTS, SystemState, LogEntry, SystemEventType } from './types';
import { Visualizer } from './components/Visualizer';
import { Dashboard } from './components/Dashboard';
import { getSystemAnalysis } from './services/ai';
import { Play, Pause, RefreshCw, Zap, Plus, Minus, Server, Database, Bot } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [isPlaying, setIsPlaying] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [state, setState] = useState<SystemState>({
    trafficLevel: 100,
    actualTraffic: 100,
    serverCount: 1,
    dbCount: 1,
    hasQueue: false,
    queueSize: 0,
    isAutoScaling: true,
    metricsHistory: [],
    logs: []
  });

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // --- Logic Helpers ---
  const addLog = (message: string, type: SystemEventType = SystemEventType.INFO) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message,
      type
    };
    setState(prev => ({
      ...prev,
      logs: [newLog, ...prev.logs].slice(0, 50) // Keep last 50
    }));
  };

  // --- Simulation Tick ---
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setState(prev => {
        // 1. Calculate Traffic Fluctuation
        const noise = (Math.random() - 0.5) * (prev.trafficLevel * 0.2); // +/- 10% noise
        const currentTraffic = Math.max(0, prev.trafficLevel + noise);

        // 2. Server Logic
        const maxServerCapacity = prev.serverCount * CONSTANTS.SERVER_CAPACITY;
        const serverLoad = Math.min(currentTraffic, maxServerCapacity);
        // Traffic that exceeds server capacity is dropped or causes extreme latency
        const overloadedTraffic = Math.max(0, currentTraffic - maxServerCapacity);

        // 3. DB/Queue Logic
        let throughputToDb = serverLoad;
        let newQueueSize = prev.queueSize;

        if (prev.hasQueue) {
          // If queue exists, server dumps to queue
          newQueueSize += serverLoad;
          
          // Queue processes to DB
          const processed = Math.min(newQueueSize, CONSTANTS.QUEUE_PROCESS_RATE);
          throughputToDb = processed;
          newQueueSize -= processed;
        } else {
          // If no queue, reset queue size visually and logically
          newQueueSize = 0;
        }

        const maxDbCapacity = prev.dbCount * CONSTANTS.DB_CAPACITY;
        const dbUtilization = throughputToDb / maxDbCapacity;
        
        // 4. Latency Calculation (Simulated ms)
        // Base 20ms + Server Load Factor + DB Load Factor + Queue Wait
        let latency = 20;
        latency += (serverLoad / maxServerCapacity) * 100; // Up to 100ms from server load
        latency += (dbUtilization * 200); // Up to 200ms from DB load
        if (prev.hasQueue) latency += (prev.queueSize * 0.5); // 0.5ms per item in queue
        if (overloadedTraffic > 0) latency += 5000; // Timeout simulation

        // 5. Auto-Scaling Logic
        let nextServerCount = prev.serverCount;
        let nextDbCount = prev.dbCount;
        let nextHasQueue = prev.hasQueue;

        if (prev.isAutoScaling) {
          // Scale Servers
          if (serverLoad > maxServerCapacity * 0.8 && prev.serverCount < CONSTANTS.MAX_SERVERS) {
             nextServerCount++;
             addLog(`Auto-scaled: Added App Server (Total: ${nextServerCount})`, SystemEventType.SUCCESS);
          } else if (serverLoad < maxServerCapacity * 0.3 && prev.serverCount > 1) {
             nextServerCount--;
             addLog(`Scaled down: Removed App Server (Total: ${nextServerCount})`, SystemEventType.INFO);
          }

          // Scale Architecture (Queue)
          if (dbUtilization > 0.8 && !prev.hasQueue) {
            nextHasQueue = true;
            addLog(`Architecture Change: Added Message Queue to buffer DB spikes`, SystemEventType.WARNING);
          } else if (dbUtilization < 0.2 && prev.hasQueue && prev.queueSize === 0) {
            nextHasQueue = false;
            addLog(`Architecture Change: Removed Message Queue`, SystemEventType.INFO);
          }

          // Scale Databases
          if (prev.hasQueue && prev.queueSize > 200 && prev.dbCount < CONSTANTS.MAX_DBS) {
            nextDbCount++;
            addLog(`Auto-scaled: Added DB Read Replica (Total: ${nextDbCount})`, SystemEventType.SUCCESS);
          } else if (dbUtilization < 0.3 && prev.dbCount > 1) {
            nextDbCount--;
            addLog(`Scaled down: Removed DB Replica (Total: ${nextDbCount})`, SystemEventType.INFO);
          }
        }

        const newMetric = {
          timestamp: new Date().toLocaleTimeString(),
          traffic: currentTraffic,
          latency: latency,
          serverLoad: serverLoad,
          dbLoad: throughputToDb,
          serverCount: nextServerCount,
          dbCount: nextDbCount,
          queueSize: Math.max(0, newQueueSize)
        };

        return {
          ...prev,
          actualTraffic: currentTraffic,
          serverCount: nextServerCount,
          dbCount: nextDbCount,
          hasQueue: nextHasQueue,
          queueSize: Math.max(0, newQueueSize),
          metricsHistory: [...prev.metricsHistory, newMetric].slice(-50)
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // --- Handlers ---
  const handleAiAnalyze = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiAnalysis("Analyzing system telemetry...");
    const report = await getSystemAnalysis(stateRef.current);
    setAiAnalysis(report);
    setIsAiLoading(false);
  };

  const updateTraffic = (delta: number) => {
    setState(prev => ({ ...prev, trafficLevel: Math.max(0, prev.trafficLevel + delta) }));
  };

  const toggleAutoScale = () => {
    setState(prev => ({ ...prev, isAutoScaling: !prev.isAutoScaling }));
    addLog(state.isAutoScaling ? "Auto-scaling Disabled" : "Auto-scaling Enabled", SystemEventType.WARNING);
  };

  return (
    <div className="min-h-screen bg-background text-slate-200">
      {/* Centered Container */}
      <div className="max-w-7xl mx-auto flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-slate-700 bg-surface px-6 flex items-center justify-between z-20">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white">S</div>
            <h1 className="text-xl font-bold tracking-tight">SysArch Simulator <span className="text-xs font-normal text-slate-400 ml-2">v2.0.0</span></h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleAiAnalyze}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md text-sm font-medium transition-colors border border-purple-500"
            >
              <Bot size={16} />
              <span>{isAiLoading ? 'Analyzing...' : 'Ask AI Advisor'}</span>
            </button>
            <div className="h-6 w-px bg-slate-600"></div>
            <a href="https://github.com/google/genai-toolbox" target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-white">Docs</a>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Controls & Logs */}
        <aside className="w-80 border-r border-slate-700 bg-surface/50 flex flex-col overflow-hidden">
          
          {/* Controls */}
          <div className="p-6 border-b border-slate-700 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Simulation Control</label>
              <div className="mt-3 flex items-center space-x-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md font-medium transition-all ${isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {isPlaying ? <><Pause size={16} /><span>Pause</span></> : <><Play size={16} /><span>Resume</span></>}
                </button>
                <button 
                  onClick={() => setState(prev => ({...prev, trafficLevel: 100, serverCount: 1, dbCount: 1, hasQueue: false, queueSize: 0, logs: []}))}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"
                  title="Reset"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider flex justify-between">
                <span>Traffic Generator</span>
                <span className="text-blue-400">{state.trafficLevel} RPS</span>
              </label>
              <div className="mt-3 flex items-center space-x-2">
                <button onClick={() => updateTraffic(-50)} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600"><Minus size={14}/></button>
                <input 
                  type="range" 
                  min="0" 
                  max="2000" 
                  step="50" 
                  value={state.trafficLevel}
                  onChange={(e) => setState(prev => ({ ...prev, trafficLevel: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <button onClick={() => updateTraffic(50)} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600"><Plus size={14}/></button>
              </div>
              <div className="flex justify-between mt-2">
                <button onClick={() => updateTraffic(500)} className="text-xs px-2 py-1 bg-red-900/50 text-red-400 border border-red-900 rounded hover:bg-red-900/80">Spike +500</button>
                <button onClick={() => setState(prev => ({ ...prev, trafficLevel: 100 }))} className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600">Normalize</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">System Config</label>
              <div className="mt-3 space-y-2">
                 <button 
                  onClick={toggleAutoScale}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-all ${state.isAutoScaling ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                >
                  <div className="flex items-center space-x-2">
                    <Zap size={16} />
                    <span>Auto-Scaling</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${state.isAutoScaling ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-slate-500'}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/20">
            <div className="p-3 border-b border-slate-700 text-xs font-semibold text-slate-500 uppercase">System Events</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {state.logs.length === 0 && <div className="text-slate-600 italic text-center mt-10">No events recorded</div>}
              {state.logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2 animate-fade-in">
                  <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, second:'2-digit', minute:'2-digit' })}</span>
                  <span className={`${
                    log.type === SystemEventType.SUCCESS ? 'text-emerald-400' :
                    log.type === SystemEventType.WARNING ? 'text-amber-400' :
                    log.type === SystemEventType.ERROR ? 'text-red-400' :
                    'text-slate-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: Visualization */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative">
          {/* AI Overlay Panel */}
          {aiAnalysis && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-3/4 max-w-2xl bg-surface/95 backdrop-blur border border-purple-500/50 p-4 rounded-lg shadow-2xl z-30 animate-in slide-in-from-top-4 fade-in duration-300">
               <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center space-x-2 text-purple-400">
                   <Bot size={18} />
                   <span className="font-bold">AI Advisor Insight</span>
                 </div>
                 <button onClick={() => setAiAnalysis("")} className="text-slate-500 hover:text-white">×</button>
               </div>
               <p className="text-slate-200 text-sm leading-relaxed">{aiAnalysis}</p>
            </div>
          )}

          <div className="flex-1 p-6 flex flex-col space-y-6 overflow-y-auto">
            {/* Top: Diagram */}
            <div className="h-[500px] shrink-0">
               <Visualizer state={state} />
            </div>

            {/* Bottom: Metrics */}
            <div className="flex-1 min-h-[300px]">
              <Dashboard state={state} />
            </div>
          </div>
        </main>

        </div>
      </div>
    </div>
  );
};

export default App;