/**
 * ESLint rule: require-console-error-in-catch
 * Enforces that every catch block calls console.* or logger.* (error/warn/info/log).
 */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce a logging call (console.* or logger.*) in catch blocks',
      recommended: true,
    },
    fixable: null,
    schema: [],
  },
  create(context) {
    return {
      CatchClause(node) {
        const body = node.body.body;
        if (!body || body.length === 0) return;

        const hasLogCall = body.some((stmt) => {
          if (stmt.type !== 'ExpressionStatement') return false;
          const { expression } = stmt;
          if (expression.type !== 'CallExpression') return false;
          const { callee } = expression;
          if (callee.type !== 'MemberExpression') return false;
          const { object, property } = callee;
          if (object.type !== 'Identifier') return false;
          if (property.type !== 'Identifier') return false;
          const validLoggers = ['console', 'logger'];
          const validMethods = ['error', 'warn', 'info', 'log'];
          return validLoggers.includes(object.name) && validMethods.includes(property.name);
        });

        if (!hasLogCall) {
          context.report({
            node,
            message:
              'Catch block must contain a console.* or logger.* call (error/warn/info/log) for observability.',
          });
        }
      },
    };
  },
};

export const requireConsoleErrorInCatch = rule;
export default rule;
