export class AuthResponseDto {
    token: string;
    expiresIn: number;
    user:{
      id_usuario: number;
      nome: string;
      email: string;
      usuario: string;
      status:number;
    }
  }