import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { prisma } from './database';

export function configurePassport() {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'change-me-in-production',
  };

  passport.use(
    new JwtStrategy(opts, async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });
        if (user) {
          return done(null, {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          });
        }
        return done(null, false);
        // eslint-disable-next-line linting-rules/require-console-error-in-catch -- error is passed to done() callback
      } catch (error) {
        return done(error, false);
      }
    })
  );
}
