import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthResponseDto } from '../auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(
    @Body('usuario') usuario: string,
    @Body('senha') senha: string,
  ): Promise<AuthResponseDto> {
    return this.authService.signIn(usuario, senha);
  }
}