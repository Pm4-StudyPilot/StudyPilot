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

export interface UpdateProfileDto {
  username: string;
  email: string;
}

export interface CourseDto {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
