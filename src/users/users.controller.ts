import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import type { Request } from 'express';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateMe(
    @Req() req: Request,
    @Body('displayName') displayName?: string,
    @Body('avatarUrl') avatarUrl?: string,
  ) {
    const user = req.user as { id: string };
    return this.usersService.updateProfile(user.id, { displayName, avatarUrl });
  }
}
