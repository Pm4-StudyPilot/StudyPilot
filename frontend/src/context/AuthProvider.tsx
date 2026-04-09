import { ReactNode, useState } from 'react';
import { AuthContext } from './AuthContext';
import { UpdateProfileDto, UserDto } from '../types/dto';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserDto | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  function login(newToken: string, newUser: UserDto) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function updateUser(updates: Partial<UpdateProfileDto>) {
    if (!user) return;

    const mergedUser: UserDto = {
      ...user,
      ...updates,
    };

    setUser(mergedUser);
    localStorage.setItem('user', JSON.stringify(mergedUser));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
