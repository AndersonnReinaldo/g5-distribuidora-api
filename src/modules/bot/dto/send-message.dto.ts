import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  recipientPhoneNumber: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}
