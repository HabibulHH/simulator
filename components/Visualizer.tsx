import React, { useMemo } from 'react';
import { SystemState } from '../types';
import { Server, Database, Users, Layers, LayoutGrid } from 'lucide-react';

interface VisualizerProps {
  state: SystemState;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 500;
const CENTER_Y = CANVAS_HEIGHT / 2;
const NODE_RADIUS = 36; // Matches visual radius of icons to ensure lines touch perfectly

export const Visualizer: React.FC<VisualizerProps> = ({ state }) => {
  // --- Layout System ---
  const layout = useMemo(() => {
    return {
      client: { x: 100, y: CENTER_Y },
      lb: { x: 300, y: CENTER_Y },
      // Servers dynamic based on count
      serversX: 500,
      // Queue optional
      queue: state.hasQueue ? { x: 700, y: CENTER_Y } : null,
      // DB dynamic based on count
      dbX: state.hasQueue ? 900 : 700
    };
  }, [state.hasQueue]);

  const serverNodes = useMemo(() => 
    Array.from({ length: state.serverCount }).map((_, i) => ({
      id: `server-${i}`,
      x: layout.serversX,
      y: CENTER_Y + (i - (state.serverCount - 1) / 2) * 90
    })), 
  [state.serverCount, layout.serversX]);

  const dbNodes = useMemo(() => 
    Array.from({ length: state.dbCount }).map((_, i) => ({
      id: `db-${i}`,
      x: layout.dbX,
      y: CENTER_Y + (i - (state.dbCount - 1) / 2) * 90
    })), 
  [state.dbCount, layout.dbX]);

  // Animation calculation
  const trafficSpeed = Math.max(0.5, 2 - (state.actualTraffic / 500));
  const isOverloaded = state.actualTraffic > (state.serverCount * 150);
  
  // Helper to render connection
  const renderConnection = (
    key: string, 
    x1: number, y1: number, 
    x2: number, y2: number, 
    color: string,
    hasPackets: boolean,
    packetColor: string = color
  ) => {
    // Calculate control points for Bezier
    const midX = (x1 + x2) / 2;
    // Adjust control points based on vertical distance to create smooth S-curves
    const controlX1 = x1 + (midX - x1) * 0.5;
    const controlX2 = x2 - (midX - x1) * 0.5;

    const pathD = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;

    return (
      <g key={key}>
        {/* Main Line */}
        <path
          d={pathD}
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity="0.6"
          markerEnd="url(#arrowhead)"
        />
        {/* Animated Packets */}
        {hasPackets && state.actualTraffic > 0 && (
          <circle r="3" fill={packetColor}>
            <animateMotion
              dur={`${trafficSpeed}s`}
              repeatCount="indefinite"
              path={pathD}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full h-10 bg-slate-900/80 border-b border-slate-800 flex items-center px-4 justify-between z-10 backdrop-blur-sm">
        <span className="text-xs font-mono text-blue-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          LIVE_ARCH_VIEW
        </span>
      </div>

      <svg 
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} 
        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
          </marker>
          <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {/* 1. Client -> LB */}
        <path
          d={`M ${layout.client.x + NODE_RADIUS} ${layout.client.y} L ${layout.lb.x - NODE_RADIUS} ${layout.lb.y}`}
          stroke={isOverloaded ? "#ef4444" : "#3b82f6"}
          strokeWidth="2"
          strokeDasharray="5,5"
          fill="none"
          className="animate-[flow_1s_linear_infinite]"
          markerEnd="url(#arrowhead-blue)"
        />

        {/* 2. LB -> Servers */}
        {serverNodes.map((srv, i) => 
          renderConnection(
            `lb-srv-${i}`, 
            layout.lb.x + NODE_RADIUS, layout.lb.y, 
            srv.x - NODE_RADIUS, srv.y, 
            "#64748b", 
            true,
            "#60a5fa"
          )
        )}

        {/* 3. Servers -> Next Hop */}
        {serverNodes.map((srv) => {
          if (layout.queue) {
            // Server -> Queue
            return renderConnection(
              `srv-q-${srv.id}`,
              srv.x + NODE_RADIUS, srv.y,
              layout.queue.x - NODE_RADIUS, layout.queue.y,
              "#f59e0b",
              true,
              "#fbbf24"
            );
          } else {
             // Server -> DBs (Direct)
             return dbNodes.map((db) => 
               renderConnection(
                 `srv-db-${srv.id}-${db.id}`,
                 srv.x + NODE_RADIUS, srv.y,
                 db.x - NODE_RADIUS, db.y,
                 "#6366f1",
                 true,
                 "#818cf8"
               )
             );
          }
        })}

        {/* 4. Queue -> DBs */}
        {layout.queue && dbNodes.map((db) => 
          renderConnection(
            `q-db-${db.id}`,
            layout.queue!.x + NODE_RADIUS, layout.queue!.y,
            db.x - NODE_RADIUS, db.y,
            "#f59e0b",
            state.queueSize > 0 || state.actualTraffic > 0,
            "#fbbf24"
          )
        )}
      </svg>

      {/* --- Nodes (HTML Overlay) --- */}
      
      {/* Client */}
      <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: layout.client.x, top: layout.client.y }}>
        <div className={`p-4 rounded-full border-2 bg-slate-900 z-10 ${isOverloaded ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]'}`}>
          <Users className={`w-8 h-8 ${isOverloaded ? 'text-red-500' : 'text-blue-500'}`} />
        </div>
        <div className="mt-2 text-xs font-bold text-slate-300">CLIENTS</div>
      </div>

      {/* LB */}
      <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: layout.lb.x, top: layout.lb.y }}>
        <div className="p-4 rounded-xl border-2 border-purple-500 bg-slate-900 z-10 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
          <Layers className="w-8 h-8 text-purple-500" />
        </div>
        <div className="mt-2 text-xs font-bold text-slate-300">LOAD BALANCER</div>
      </div>

      {/* Servers */}
      {serverNodes.map(srv => (
        <div key={srv.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500" style={{ left: srv.x, top: srv.y }}>
          <div className={`p-3 rounded-lg border-2 bg-slate-900 z-10 ${isOverloaded ? 'border-red-500' : 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
            <Server className={`w-6 h-6 ${isOverloaded ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
        </div>
      ))}
      <div className="absolute text-[10px] font-bold text-slate-500 uppercase top-[90%] transform -translate-x-1/2" style={{ left: layout.serversX }}>Servers ({state.serverCount})</div>

      {/* Queue */}
      {layout.queue && (
        <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-in zoom-in" style={{ left: layout.queue.x, top: layout.queue.y }}>
          <div className="p-4 rounded-xl border-2 border-amber-500 bg-slate-900 z-10 shadow-[0_0_20px_rgba(245,158,11,0.4)] relative">
            <LayoutGrid className="w-8 h-8 text-amber-500" />
            {state.queueSize > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full border border-slate-900">{state.queueSize}</span>
            )}
          </div>
          <div className="mt-2 text-xs font-bold text-slate-300">QUEUE</div>
        </div>
      )}

      {/* Databases */}
      {dbNodes.map(db => (
        <div key={db.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500" style={{ left: db.x, top: db.y }}>
          <div className="p-3 rounded-full border-2 border-indigo-500 bg-slate-900 z-10 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <Database className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
      ))}
      <div className="absolute text-[10px] font-bold text-slate-500 uppercase top-[90%] transform -translate-x-1/2" style={{ left: layout.dbX }}>Databases ({state.dbCount})</div>

    </div>
  );
};