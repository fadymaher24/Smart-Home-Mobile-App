type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = __DEV__ ? 'debug' : 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  if (__DEV__) {
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.component}] ${entry.message}${dataStr}`;
  }
  return JSON.stringify(entry);
}

function createLogEntry(level: LogLevel, component: string, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    ...(data && { data }),
  };
}

function log(level: LogLevel, component: string, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry = createLogEntry(level, component, message, data);
  const formatted = formatLogEntry(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

export function createLogger(component: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', component, message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', component, message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', component, message, data),
    error: (message: string, data?: Record<string, unknown>) => log('error', component, message, data),
  };
}

export const logger = {
  debug: (component: string, message: string, data?: Record<string, unknown>) => log('debug', component, message, data),
  info: (component: string, message: string, data?: Record<string, unknown>) => log('info', component, message, data),
  warn: (component: string, message: string, data?: Record<string, unknown>) => log('warn', component, message, data),
  error: (component: string, message: string, data?: Record<string, unknown>) => log('error', component, message, data),
};