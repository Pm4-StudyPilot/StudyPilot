import bcrypt from 'bcrypt';
import { UpdateProfileRequest, UserDto } from '../types';
import { prisma } from '../config/database';

export class UserService {
  async findById(id: string): Promise<UserDto | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<UserDto> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: updates.email }, { username: updates.username }],
        NOT: { id: userId },
      },
      select: {
        email: true,
        username: true,
      },
    });

    if (existingUser?.email === updates.email) {
      throw new Error('Email is already in use');
    }

    if (existingUser?.username === updates.username) {
      throw new Error('Username is already in use');
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        email: updates.email,
        username: updates.username,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });
  }

  async deleteAccount(userId: string): Promise<UserDto> {
    const existingUser = await prisma.user.findFirst({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    return prisma.user.delete({
      where: { id: userId },
    });
  }
}
