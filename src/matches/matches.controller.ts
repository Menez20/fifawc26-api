import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

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

  // Manually trigger a sync (useful for testing)
  @Post('sync')
  sync() {
    return this.matchesService.syncMatches();
  }
}
