import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class LanguageDto {
  @ApiProperty({ example: 1, description: 'ID языка' })
  @IsInt()
  id: number;

  @ApiProperty({ example: 'en', description: 'ISO 639-1 код языка' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Английский', description: 'Название языка' })
  @IsString()
  @IsNotEmpty()
  name: string;
} 