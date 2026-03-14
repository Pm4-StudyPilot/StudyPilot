import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";

const userRouter = Router();
const userController = new UserController();

userRouter.get("/me", authenticate, (req, res) => userController.me(req, res));

export { userRouter };
