import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthPayload, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('users')
  listUsers() {
    return this.authService.getUserList();
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.code);
  }

  @Get('me')
  me(@Req() req: Request & { user: AuthPayload }) {
    return {
      username: req.user.username,
      displayName: req.user.displayName,
      role: req.user.role,
    };
  }
}
