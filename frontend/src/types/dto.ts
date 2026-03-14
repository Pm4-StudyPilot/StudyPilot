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
