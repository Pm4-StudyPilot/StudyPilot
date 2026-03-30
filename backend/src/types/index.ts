import { Role } from "../generated/prisma/client";

// --- Internal types ---

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: Role;
}

// --- Request DTOs ---

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface CreateCourseRequest {
  name: string;
}

export interface UpdateCourseRequest {
  name: string;
}

// --- Response DTOs ---

export interface UserDto {
  id: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
}

export interface CourseDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
