import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(nome:string, email: string, usuario: string, password: string) {
    const existingUser = await this.prisma.usuarios.findFirst({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Este email já está cadastrado.');
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    return this.prisma.usuarios.create({
      data: { nome,email, usuario, senha: hashedPassword },
    });
  }

  async findByUsername(usuario: string) {
    const user = await this.prisma.usuarios.findFirst({ where: { usuario } });
    const company =  await this.prisma.empresa_config.findFirst();

    if (!user) {
      return null;
    }
    return { ...user, company };
  }

  async validatePassword(username: string, password: string) {
    const user = await this.findByUsername(username);
    if (user && await bcrypt.compare(password, user.senha)) {
      return user;
    }
    return null;
  }

  async findAllUsers() {
    return this.prisma.usuarios.findMany();
  }

  async findUserById(id: number) {
    return this.prisma.usuarios.findUnique({ where: { id_usuario: id } });
  }

  async updateUser(id: number, data: { email?: string; password?: string }) {
    // Verificar se o email já está cadastrado ao editar
    if (data.email) {
      const existingUser = await this.prisma.usuarios.findFirst({ where: { email: data.email } });
      if (existingUser) {
        throw new BadRequestException('Este email já está cadastrado.');
      }
    }

    return this.prisma.usuarios.update({
      where: { id_usuario: id },
      data,
    });
  }

  async deleteUser(id: number) {
    return this.prisma.usuarios.delete({
      where: { id_usuario: id },
    });
  }
}
