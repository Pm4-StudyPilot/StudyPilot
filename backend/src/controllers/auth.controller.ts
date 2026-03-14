import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterRequest, LoginRequest } from "../types";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body as RegisterRequest;

      if (!email || !username || !password) {
        res.status(400).json({ message: "Email, username, and password are required" });
        return;
      }

      const result = await authService.register(email, username, password);
      res.status(201).json(result);
    } catch (error: any) {
      if (error.code === "P2002") {
        res.status(409).json({ message: "Email or username already exists" });
        return;
      }
      res.status(500).json({ message: "Registration failed" });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: "Invalid credentials" });
    }
  }
}
