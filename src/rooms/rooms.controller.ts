import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  create(@Req() req: Request, @Body('name') name: string) {
    const user = req.user as { id: string };
    return this.roomsService.create(user.id, name);
  }

  @Get()
  getMyRooms(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.roomsService.getMyRooms(user.id);
  }

  @Get(':id')
  getRoom(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.roomsService.getRoom(id, user.id);
  }

  @Post('join')
  join(@Req() req: Request, @Body('inviteCode') inviteCode: string) {
    const user = req.user as { id: string };
    return this.roomsService.join(user.id, inviteCode);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.roomsService.delete(id, user.id);
  }
}