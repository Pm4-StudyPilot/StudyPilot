import { UserDto } from "../types";
import { prisma } from "../config/database";

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
}
