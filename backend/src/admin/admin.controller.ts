import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findAll() {
    return this.adminService.findAll();
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }
}
