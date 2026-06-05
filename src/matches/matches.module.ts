import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PredictionsModule } from '../predictions/predictions.module';

@Module({
  imports: [PrismaModule, HttpModule, PredictionsModule],
  providers: [MatchesService],
  controllers: [MatchesController],
  exports: [MatchesService],
})
export class MatchesModule {}