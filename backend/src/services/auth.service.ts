import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JwtPayload, AuthResponse } from "../types";
import { prisma } from "../config/database";
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export class AuthService {
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    const token = this.generateToken(user);
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role }, token };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user);
    return { user: { id: user.id, email: user.email, username: user.username, role: user.role }, token };
  }

  private generateToken(user: { id: string; email: string; role: string }): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as JwtPayload["role"],
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  }
}
