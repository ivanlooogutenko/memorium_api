import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user1', description: 'Имя пользователя' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Пароль пользователя' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 1, description: 'ID языка интерфейса', required: false })
  @IsOptional()
  @IsNumber()
  interface_language_id?: number;
  
  @ApiProperty({ description: 'ID пользователя (не рекомендуется указывать вручную)', required: false })
  @IsOptional()
  @IsString()
  id?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user1', description: 'Имя пользователя' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'password123', description: 'Пароль пользователя' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class TokenPayloadDto {
  sub: number;
  username: string;
  iat?: number;
  exp?: number;
}