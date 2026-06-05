import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async findOrCreate(data: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { googleId: data.googleId },
    });

    if (!user) {
      user = await this.prisma.user.create({ data });
    }

    // Always ensure global room membership
    const globalRoom = await this.prisma.room.findFirst({
      where: { inviteCode: 'GLOBAL' },
    });

    if (globalRoom) {
      await this.prisma.roomMember.upsert({
        where: { roomId_userId: { roomId: globalRoom.id, userId: user.id } },
        update: {},
        create: { roomId: globalRoom.id, userId: user.id },
      });
    }

    return user;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
