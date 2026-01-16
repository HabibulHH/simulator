import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { SystemState } from '../types';
import { Activity, Server, Database, AlertCircle } from 'lucide-react';

interface DashboardProps {
  state: SystemState;
}

export const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const data = state.metricsHistory.slice(-30); // Last 30 data points

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      
      {/* Metric Cards */}
      <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2 text-slate-400 mb-1">
            <Activity size={16} />
            <span className="text-xs uppercase font-semibold">Traffic</span>
          </div>
          <div className="text-2xl font-bold text-white">{state.actualTraffic.toFixed(0)} <span className="text-sm text-slate-500">RPS</span></div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2 text-slate-400 mb-1">
            <Server size={16} />
            <span className="text-xs uppercase font-semibold">Server Load</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {Math.round((state.actualTraffic / (state.serverCount * 150)) * 100)}%
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-slate-700">
          <div className="flex items-center space-x-2 text-slate-400 mb-1">
            <Database size={16} />
            <span className="text-xs uppercase font-semibold">DB Load</span>
          </div>
          <div className="text-2xl font-bold text-white">
             {Math.round((state.actualTraffic / (state.dbCount * 400)) * 100)}%
          </div>
        </div>

        <div className={`p-4 rounded-xl border ${state.hasQueue && state.queueSize > 50 ? 'bg-red-900/20 border-red-500' : 'bg-surface border-slate-700'}`}>
          <div className="flex items-center space-x-2 text-slate-400 mb-1">
            <AlertCircle size={16} />
            <span className="text-xs uppercase font-semibold">Queue</span>
          </div>
          <div className="text-2xl font-bold text-white">{state.queueSize}</div>
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="bg-surface p-4 rounded-xl border border-slate-700 h-64">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Traffic vs Latency</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="timestamp" hide />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
            />
            <Area type="monotone" dataKey="traffic" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTraffic)" name="Traffic" />
            <Area type="monotone" dataKey="latency" stroke="#ef4444" fill="transparent" strokeWidth={2} name="Latency (ms)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Resources Chart */}
      <div className="bg-surface p-4 rounded-xl border border-slate-700 h-64">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Resources Scaling</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="timestamp" hide />
            <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
            />
            <Line type="step" dataKey="serverCount" stroke="#10b981" strokeWidth={2} dot={false} name="Servers" />
            <Line type="step" dataKey="dbCount" stroke="#f59e0b" strokeWidth={2} dot={false} name="Databases" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};