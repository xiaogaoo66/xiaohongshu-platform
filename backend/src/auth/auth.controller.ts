import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('api/admin')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.createAdmin(loginDto.username, loginDto.password);
    } catch (error) {
      console.error('注册错误:', error);
      if (error.code === 'P2002') {
        throw new HttpException('用户名已存在', HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || '注册失败',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}


