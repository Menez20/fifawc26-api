import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionsService } from '../predictions/predictions.service';
import { firstValueFrom } from 'rxjs';
import { MatchStatus } from '@prisma/client';

const STATUS_MAP: Record<string, MatchStatus> = {
  SCHEDULED: MatchStatus.SCHEDULED,
  TIMED: MatchStatus.SCHEDULED,
  IN_PLAY: MatchStatus.LIVE,
  PAUSED: MatchStatus.LIVE,
  FINISHED: MatchStatus.FINISHED,
};

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    private predictionsService: PredictionsService,
  ) {}

  @Cron('*/2 * * * *')
  async syncMatches() {
    this.logger.log('Syncing WC2026 matches...');
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          'https://api.football-data.org/v4/competitions/WC/matches',
          {
            headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
          },
        ),
      );

      for (const match of data.matches) {
        if (!match.homeTeam?.name || !match.awayTeam?.name) continue;

        const status = STATUS_MAP[match.status] ?? MatchStatus.SCHEDULED;

        await this.prisma.match.upsert({
          where: { externalId: String(match.id) },
          update: {
            homeScore: match.score?.fullTime?.home ?? null,
            awayScore: match.score?.fullTime?.away ?? null,
            homeCrest: match.homeTeam.crest ?? null,
            awayCrest: match.awayTeam.crest ?? null,
            status,
          },
          create: {
            externalId: String(match.id),
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
            homeCrest: match.homeTeam.crest ?? null,
            awayCrest: match.awayTeam.crest ?? null,
            stage: match.stage,
            kickoffAt: new Date(match.utcDate),
            homeScore: match.score?.fullTime?.home ?? null,
            awayScore: match.score?.fullTime?.away ?? null,
            status,
          },
        });

        // Score predictions when a match just finished
        if (status === MatchStatus.FINISHED) {
          await this.predictionsService.scoreMatch(
            (await this.prisma.match.findUnique({
              where: { externalId: String(match.id) },
            }))!.id,
          );
        }
      }
      this.logger.log(`Synced ${data.matches.length} matches`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to sync matches', message);
    }
  }

  async getAllMatches() {
    return this.prisma.match.findMany({ orderBy: { kickoffAt: 'asc' } });
  }

  async getMatch(id: string) {
    return this.prisma.match.findUnique({ where: { id } });
  }

  async getLiveMatches() {
    return this.prisma.match.findMany({
      where: { status: MatchStatus.LIVE },
      orderBy: { kickoffAt: 'asc' },
    });
  }

  async getGroups() {
    const { data } = await firstValueFrom(
      this.http.get(
        'https://api.football-data.org/v4/competitions/WC/standings',
        {
          headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
        },
      ),
    );
    return data.standings; // make sure this is returned
  }
}
