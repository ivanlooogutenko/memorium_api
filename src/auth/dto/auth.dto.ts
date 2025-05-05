import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user1', description: 'Имя пользователя' })
  @IsNotEmpty() @IsString()
  username: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsNotEmpty() @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Пароль пользователя' })
  @IsNotEmpty() @IsString() @MinLength(6)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user1', description: 'Имя пользователя' })
  @IsNotEmpty() @IsString()
  username: string;

  @ApiProperty({ example: 'password123', description: 'Пароль пользователя' })
  @IsNotEmpty() @IsString()
  password: string;
}

export class TokenPayloadDto {
  sub: number;
  username: string;
}