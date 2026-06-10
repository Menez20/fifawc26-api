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
    const existing = await this.prisma.user.findUnique({
      where: { googleId: data.googleId },
    });

    if (existing) {
      // Always ensure global room membership
      const globalRoom = await this.prisma.room.findFirst({
        where: { inviteCode: 'GLOBAL' },
      });
      if (globalRoom) {
        await this.prisma.roomMember.upsert({
          where: {
            roomId_userId: { roomId: globalRoom.id, userId: existing.id },
          },
          update: {},
          create: { roomId: globalRoom.id, userId: existing.id },
        });
      }
      return { ...existing, isNewUser: false };
    }

    const user = await this.prisma.user.create({ data });

    // Auto-join global room
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

    return { ...user, isNewUser: true };
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateProfile(
    id: string,
    data: { displayName?: string; avatarUrl?: string },
  ) {
    const updateData: any = {};
    if (data.displayName?.trim())
      updateData.displayName = data.displayName.trim();
    if (data.avatarUrl?.trim()) updateData.avatarUrl = data.avatarUrl.trim();

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }
}
