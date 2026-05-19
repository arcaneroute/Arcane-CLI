import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const debugEnv = process.env.DEBUG?.toLowerCase();

function getLogLevel(): pino.Level {
  if (debugEnv === 'true' || debugEnv === '1') return 'debug';
  if (debugEnv === 'debug') return 'debug';
  if (debugEnv === 'info') return 'info';
  if (debugEnv === 'warn') return 'warn';
  if (debugEnv === 'error') return 'error';
  return isDev ? 'debug' : 'info';
}

const level = getLogLevel();

const prettyOptions = {
  colorize: true,
  translateTime: 'HH:MM:ss',
};
export const logger = isDev
  ? pino({ transport: { target: "pino-pretty", options: prettyOptions }}).child({ level })
  : pino({ level });
logger.info(`[Logger] Initializing logger at level '${level}' (DEBUG=${debugEnv ?? 'not set'})`);

export default logger;
