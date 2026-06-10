import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private predictionsService: PredictionsService) {}

  @Post()
  submit(
    @Req() req: Request,
    @Body('matchId') matchId: string,
    @Body('roomId') roomId: string,
    @Body('predictedHome') predictedHome: number,
    @Body('predictedAway') predictedAway: number,
    @Body('predictedPenaltyWinner') predictedPenaltyWinner?: string,
  ) {
    const user = req.user as { id: string };
    return this.predictionsService.submit(
      user.id,
      matchId,
      roomId,
      predictedHome,
      predictedAway,
      predictedPenaltyWinner,
    );
  }

  @Get('room/:roomId')
  getMyPredictions(@Param('roomId') roomId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.predictionsService.getMyPredictions(user.id, roomId);
  }

  @Get('room/:roomId/leaderboard')
  getLeaderboard(@Param('roomId') roomId: string) {
    return this.predictionsService.getLeaderboard(roomId);
  }
}
