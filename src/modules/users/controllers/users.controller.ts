import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() createUserDto: { email: string; usuario: string; senha: string }) {
    return this.usersService.createUser(createUserDto.email, createUserDto.usuario, createUserDto.senha);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll() {
    return this.usersService.findAllUsers();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.usersService.findUserById(id);
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async update(@Param('id') id: number, @Body() updateUserDto: { email?: string; password?: string }) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.usersService.deleteUser(id);
  }
}
