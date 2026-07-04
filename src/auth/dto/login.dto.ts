import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
