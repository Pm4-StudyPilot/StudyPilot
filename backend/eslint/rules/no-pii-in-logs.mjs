/**
 * ESLint rule: no-pii-in-logs
 * Disallows passing known PII / secret fields directly into a logger.* or console.* call.
 * PII is also redacted at runtime (see src/lib/logger.ts), but this catches the mistake
 * at author time so it never reaches review/CI.
 */

// Mirrors the redaction denylist in src/lib/logger.ts (object keys only — header
// paths like authorization aren't object literals in source).
const PII_FIELDS = [
  'email',
  'identifier',
  'password',
  'newPassword',
  'token',
  'passwordResetToken',
];

const LOG_OBJECTS = ['logger', 'console'];
const LOG_METHODS = ['info', 'warn', 'error', 'debug', 'log'];

/** Extracts a property's key name whether it's an identifier or string literal. */
function keyName(property) {
  if (property.type !== 'Property') return null;
  const { key } = property;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow logging known PII / secret fields directly',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noPiiInLogs:
        "Avoid logging PII field '{{name}}'. It is redacted at runtime, but don't pass it into logger.*/console.* directly.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        const { object, property } = callee;
        if (object.type !== 'Identifier' || !LOG_OBJECTS.includes(object.name)) return;
        if (property.type !== 'Identifier' || !LOG_METHODS.includes(property.name)) return;

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type !== 'ObjectExpression') return;

        for (const prop of firstArg.properties) {
          const name = keyName(prop);
          if (name && PII_FIELDS.includes(name)) {
            context.report({ node: prop, messageId: 'noPiiInLogs', data: { name } });
          }
        }
      },
    };
  },
};

export const noPiiInLogs = rule;
export default rule;
