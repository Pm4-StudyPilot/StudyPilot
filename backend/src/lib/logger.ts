import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// PII / secret fields to strip from logs. Listed both at the top level and one
// level deep (`*.x`) because pino's fast-redact `*` matches a single nesting
// level, covering both `{ email }` and `{ error: { email } }` / `{ user: { email } }`.
const PII_PATHS = [
  'email',
  'identifier',
  'password',
  'newPassword',
  'token',
  'passwordResetToken',
  '*.email',
  '*.identifier',
  '*.password',
  '*.newPassword',
  '*.token',
  '*.passwordResetToken',
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
];

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  redact: { paths: PII_PATHS, censor: '[REDACTED]' },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

export default logger;
