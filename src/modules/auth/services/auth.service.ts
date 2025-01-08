import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { ConfigService } from '@nestjs/config';
import { AuthResponseDto } from '../auth.dto';
import { compareSync as bcryptCompareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private jwtExpirationTimeInSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtExpirationTimeInSeconds = +this.configService.get<number>(
      'JWT_EXPIRATION_TIME',
    );
  }

  async signIn(usuario: string, senha: string): Promise<AuthResponseDto> {
    const foundUser = await this.usersService.findByUsername(usuario);
    if (!foundUser || !bcryptCompareSync(String(senha), foundUser.senha)) {
      throw new UnauthorizedException();
    }

    const payload = { sub: foundUser.id_usuario, username: foundUser.senha };
    const secret:string = this.configService.get<string>('JWT_SECRET')
    const token = this.jwtService.sign(payload, { secret });
    return { token, expiresIn: this.jwtExpirationTimeInSeconds, user: foundUser };
  }
}
