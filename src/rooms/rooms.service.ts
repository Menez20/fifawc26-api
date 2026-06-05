import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  private generateInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase(); // e.g. "A3F2B1C4"
  }

  async create(userId: string, name: string) {
    return this.prisma.room.create({
      data: {
        name,
        inviteCode: this.generateInviteCode(),
        createdById: userId,
        members: {
          create: { userId }, // creator auto-joins
        },
      },
      include: { members: true },
    });
  }

  async getMyRooms(userId: string) {
    return this.prisma.room.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async getRoom(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: true },
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');

    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('You are not a member of this room');

    return room;
  }

  async join(userId: string, inviteCode: string) {
    const room = await this.prisma.room.findUnique({ where: { inviteCode } });
    if (!room) throw new NotFoundException('Invalid invite code');

    const existing = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (existing) throw new BadRequestException('You are already in this room');

    return this.prisma.roomMember.create({
      data: { roomId: room.id, userId },
    });
  }

  async delete(roomId: string, userId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.createdById !== userId) throw new ForbiddenException('Only the creator can delete this room');

    return this.prisma.room.delete({ where: { id: roomId } });
  }
}