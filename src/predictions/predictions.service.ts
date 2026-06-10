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
    predictedPenaltyWinner?: string | null,
    actualPenaltyWinner?: string | null,
  ): number {
    const exactScore =
      predictedHome === actualHome && predictedAway === actualAway;
    const predictedOutcome = Math.sign(predictedHome - predictedAway);
    const actualOutcome = Math.sign(actualHome - actualAway);
    const correctOutcome = predictedOutcome === actualOutcome;
    const isDraw = actualOutcome === 0;
    const predictedDraw = predictedOutcome === 0;

    // Penalty shootout match
    if (actualPenaltyWinner) {
      const correctPenaltyWinner =
        predictedPenaltyWinner === actualPenaltyWinner;
      if (exactScore && correctPenaltyWinner) return 9;
      if (exactScore && !correctPenaltyWinner) return 6;
      if (predictedDraw && correctPenaltyWinner) return 6;
      if (predictedDraw && !correctPenaltyWinner) return 3;
      return 0;
    }

    // Draw match
    if (isDraw) {
      if (exactScore) return 6;
      if (predictedDraw) return 3;
      return 0;
    }

    // Regular match
    if (exactScore) return 6;

    // Correct winner + correct goals for one team
    if (
      correctOutcome &&
      (predictedHome === actualHome || predictedAway === actualAway)
    )
      return 4;

    // Correct winner only
    if (correctOutcome) return 3;

    // Correct goals for one team (wrong winner)
    if (predictedHome === actualHome || predictedAway === actualAway) return 1;

    return 0;
  }

  async submit(
    userId: string,
    matchId: string,
    roomId: string,
    predictedHome: number,
    predictedAway: number,
    predictedPenaltyWinner?: string,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match not found');

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
      update: {
        predictedHome,
        predictedAway,
        predictedPenaltyWinner: predictedPenaltyWinner || null,
      },
      create: {
        userId,
        matchId,
        roomId,
        predictedHome,
        predictedAway,
        predictedPenaltyWinner: predictedPenaltyWinner || null,
      },
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
        prediction.predictedPenaltyWinner,
        match.penaltyWinner,
      );

      await this.prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsAwarded: points },
      });

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
