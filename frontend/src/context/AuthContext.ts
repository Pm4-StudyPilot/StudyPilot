import { createContext } from 'react';
import { UpdateProfileDto, UserDto } from '../types/dto';

export interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  login: (token: string, user: UserDto) => void;
  logout: () => void;
  updateUser: (updates: Partial<UpdateProfileDto>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
