import { Router } from "express";
import { CourseController } from "../controllers/course.controller";
import { authenticate } from "../middleware/auth";

const courseRouter = Router();
const courseController = new CourseController();

courseRouter.get("/", authenticate, (req, res) => courseController.list(req, res));
courseRouter.get("/:id", authenticate, (req, res) => courseController.getById(req, res));
courseRouter.post("/", authenticate, (req, res) => courseController.create(req, res));
courseRouter.patch("/:id", authenticate, (req, res) => courseController.update(req, res));
courseRouter.delete("/:id", authenticate, (req, res) => courseController.remove(req, res));

export { courseRouter };