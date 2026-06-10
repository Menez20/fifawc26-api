import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { PredictionsService } from '../predictions/predictions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(
    private matchesService: MatchesService,
    private predictionsService: PredictionsService,
  ) {}

  @Get()
  getAll() {
    return this.matchesService.getAllMatches();
  }

  @Get('live')
  getLive() {
    return this.matchesService.getLiveMatches();
  }

  @Get('groups')
  getGroups() {
    return this.matchesService.getGroups();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.matchesService.getMatch(id);
  }

  @Post('sync')
  sync() {
    return this.matchesService.syncMatches();
  }
}
