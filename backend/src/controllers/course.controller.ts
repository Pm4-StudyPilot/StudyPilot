import { Request, Response } from "express";
import { CourseService } from "../services/course.service";
import { AuthenticatedUser, CreateCourseRequest, UpdateCourseRequest } from "../types";

const courseService = new CourseService();

export class CourseController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const courses = await courseService.listByOwner(authUser.id);
      res.json(courses);
    } catch (_error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: "Course id is required" });
        return;
      }

      const course = await courseService.findByIdForOwner(id, authUser.id);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      res.json(course);
    } catch (_error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body as CreateCourseRequest;
      const authUser = req.user as AuthenticatedUser;

      if (!name?.trim()) {
        res.status(400).json({ message: "Course name is required" });
        return;
      }

      const course = await courseService.create(name.trim(), authUser.id);
      res.status(201).json(course);
    } catch (_error) {
      res.status(500).json({ message: "Failed to create course" });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const { name } = req.body as UpdateCourseRequest;

      if (!id) {
        res.status(400).json({ message: "Course id is required" });
        return;
      }

      if (!name?.trim()) {
        res.status(400).json({ message: "Course name is required" });
        return;
      }

      const updatedCourse = await courseService.updateForOwner(id, authUser.id, name.trim());
      if (!updatedCourse) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      res.json(updatedCourse);
    } catch (_error) {
      res.status(500).json({ message: "Failed to update course" });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: "Course id is required" });
        return;
      }

      const deleted = await courseService.deleteForOwner(id, authUser.id);
      if (!deleted) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      res.status(204).send();
    } catch (_error) {
      res.status(500).json({ message: "Failed to delete course" });
    }
  }
}