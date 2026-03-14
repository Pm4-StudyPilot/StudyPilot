import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { AuthenticatedUser } from "../types";

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  passport.authenticate(
    "jwt",
    { session: false },
    (err: Error | null, user: AuthenticatedUser | false) => {
      if (err || !user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      req.user = user;
      next();
    }
  )(req, res, next);
}
