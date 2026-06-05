import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchStatus } from '@prisma/client';

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) {}

  private calcPoints(
    predictedHome: number,
    predictedAway: number,
    actualHome: number,
    actualAway: number,
  ): number {
    if (predictedHome === actualHome && predictedAway === actualAway) return 3;

    const predictedOutcome = Math.sign(predictedHome - predictedAway);
    const actualOutcome = Math.sign(actualHome - actualAway);
    if (predictedOutcome === actualOutcome) return 1;

    return 0;
  }

  async submit(
    userId: string,
    matchId: string,
    roomId: string,
    predictedHome: number,
    predictedAway: number,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

    // Lock 30 minutes before kickoff
    const lockTime = new Date(match.kickoffAt.getTime() - 30 * 60 * 1000);
    if (new Date() >= lockTime) {
      throw new BadRequestException('Predictions are locked for this match');
    }

    const membership = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!membership)
      throw new ForbiddenException('You are not a member of this room');

    return this.prisma.prediction.upsert({
      where: { userId_matchId_roomId: { userId, matchId, roomId } },
      update: { predictedHome, predictedAway },
      create: { userId, matchId, roomId, predictedHome, predictedAway },
    });
  }

  async getMyPredictions(userId: string, roomId: string) {
    return this.prisma.prediction.findMany({
      where: { userId, roomId },
      include: { match: true },
      orderBy: { match: { kickoffAt: 'asc' } },
    });
  }

  async getLeaderboard(roomId: string) {
    return this.prisma.roomMember.findMany({
      where: { roomId },
      include: { user: true },
      orderBy: { score: 'desc' },
    });
  }

  // Called by the scheduler after a match finishes
  async scoreMatch(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match || match.status !== MatchStatus.FINISHED) return;
    if (match.homeScore === null || match.awayScore === null) return;

    const predictions = await this.prisma.prediction.findMany({
      where: { matchId, pointsAwarded: null },
    });

    for (const prediction of predictions) {
      const points = this.calcPoints(
        prediction.predictedHome,
        prediction.predictedAway,
        match.homeScore,
        match.awayScore,
      );

      // Save points on prediction
      await this.prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsAwarded: points },
      });

      // Add points to the user's room score
      await this.prisma.roomMember.update({
        where: {
          roomId_userId: {
            roomId: prediction.roomId,
            userId: prediction.userId,
          },
        },
        data: { score: { increment: points } },
      });
    }
  }
}
