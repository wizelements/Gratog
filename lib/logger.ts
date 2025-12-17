type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown[];
  stack?: string;
}

const LOG_COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
} as const;

const LOG_EMOJIS = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
} as const;

function isEnabled(): boolean {
  if (typeof window !== 'undefined') {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_DEBUG === 'true' ||
      localStorage.getItem('DEBUG') === 'true'
    );
  }
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG === 'true'
  );
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatEntry(entry: LogEntry): string {
  const { timestamp, level, category, message } = entry;
  const time = timestamp.split('T')[1].replace('Z', '');
  return `[${time}] [${level.toUpperCase()}] [${category}] ${message}`;
}

function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (typeof error === 'object' && error !== null && 'stack' in error) {
    return String((error as { stack: unknown }).stack);
  }
  return undefined;
}

function log(level: LogLevel, category: string, message: string, ...data: unknown[]): void {
  if (!isEnabled() && level !== 'error') {
    return;
  }

  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    category,
    message,
    data: data.length > 0 ? data : undefined,
  };

  if (level === 'error') {
    const errorData = data.find(d => d instanceof Error || (typeof d === 'object' && d !== null && 'stack' in d));
    entry.stack = extractStack(errorData);
  }

  const formatted = formatEntry(entry);

  if (isServer()) {
    const color = LOG_COLORS[level];
    const reset = LOG_COLORS.reset;
    const coloredMessage = `${color}${formatted}${reset}`;

    switch (level) {
      case 'debug':
        console.debug(coloredMessage, ...data);
        break;
      case 'info':
        console.info(coloredMessage, ...data);
        break;
      case 'warn':
        console.warn(coloredMessage, ...data);
        break;
      case 'error':
        console.error(coloredMessage, ...data);
        if (entry.stack) {
          console.error(`${color}Stack trace:${reset}`, entry.stack);
        }
        break;
    }
  } else {
    const emoji = LOG_EMOJIS[level];
    const styledMessage = `${emoji} ${formatted}`;

    switch (level) {
      case 'debug':
        console.debug(styledMessage, ...data);
        break;
      case 'info':
        console.info(styledMessage, ...data);
        break;
      case 'warn':
        console.warn(styledMessage, ...data);
        break;
      case 'error':
        console.error(styledMessage, ...data);
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }
}

export const logger = {
  debug: (category: string, message: string, ...data: unknown[]) => log('debug', category, message, ...data),
  info: (category: string, message: string, ...data: unknown[]) => log('info', category, message, ...data),
  warn: (category: string, message: string, ...data: unknown[]) => log('warn', category, message, ...data),
  error: (category: string, message: string, ...data: unknown[]) => log('error', category, message, ...data),

  withCategory: (category: string) => ({
    debug: (message: string, ...data: unknown[]) => log('debug', category, message, ...data),
    info: (message: string, ...data: unknown[]) => log('info', category, message, ...data),
    warn: (message: string, ...data: unknown[]) => log('warn', category, message, ...data),
    error: (message: string, ...data: unknown[]) => log('error', category, message, ...data),
  }),
};

export type Logger = typeof logger;
export type CategoryLogger = ReturnType<typeof logger.withCategory>;

export function createLogger(category: string) {
  return logger.withCategory(category);
}
