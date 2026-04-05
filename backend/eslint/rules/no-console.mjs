/**
 * ESLint rule: no-console
 * Disallows console.log/info/warn/error and enforces using the project logger instead.
 */
const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow console.* and enforce logger.* instead',
      recommended: false,
    },
    fixable: null,
    schema: [],
    messages: {
      noConsole:
        "Don't use console.* — use logger.info/warn/error/debug from src/lib/logger instead.",
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        const { object, property } = node;

        // Only match console.X where X is log/info/warn/error/debug
        const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];
        const isConsole = object.type === 'Identifier' && object.name === 'console';
        const isConsoleMethod =
          property.type === 'Identifier' && consoleMethods.includes(property.name);

        if (isConsole && isConsoleMethod) {
          context.report({ node, messageId: 'noConsole' });
        }
      },
    };
  },
};

export const noConsole = rule;
export default rule;
