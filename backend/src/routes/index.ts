import { Router } from "express";
import { authRouter } from "./auth.routes";
import { userRouter } from "./user.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/users", userRouter);

export { router };
