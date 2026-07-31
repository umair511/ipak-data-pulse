import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  list() { return this.usersService.list(); }

  @Post()
  create(@Body() body: any) { return this.usersService.create(body); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.usersService.update(id, body); }

  @Delete(':id')
  delete(@Param('id') id: string) { return this.usersService.delete(id); }

  @Patch(':id/password')
  changePassword(@Param('id') id: string, @Body() body: any) { return this.usersService.changePassword(id, body); }

  @Post('batch-passwords')
  batchPasswords(@Body() body: any) { return this.usersService.batchPasswords(body); }
}
