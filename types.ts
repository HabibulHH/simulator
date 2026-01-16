export enum SystemEventType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: SystemEventType;
}

export interface SystemMetrics {
  timestamp: string; // Time string for charts
  traffic: number;
  latency: number;
  serverLoad: number;
  dbLoad: number;
  serverCount: number;
  dbCount: number;
  queueSize: number;
}

export interface SystemState {
  trafficLevel: number; // User controlled base traffic
  actualTraffic: number; // With noise
  serverCount: number;
  dbCount: number;
  hasQueue: boolean;
  queueSize: number;
  isAutoScaling: boolean;
  metricsHistory: SystemMetrics[];
  logs: LogEntry[];
}

export const CONSTANTS = {
  MAX_SERVERS: 8,
  MAX_DBS: 4,
  SERVER_CAPACITY: 150, // Requests per second per server
  DB_CAPACITY: 400, // Requests per second per DB
  QUEUE_PROCESS_RATE: 300, // Requests processed from queue per tick
};