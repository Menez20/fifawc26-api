import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  login(user: { id: string; email: string; isNewUser?: boolean }) {
    const payload = {
      sub: user.id,
      email: user.email,
      isNewUser: user.isNewUser || false,
    };
    return this.jwtService.sign(payload);
  }
}
