import { IsString, IsOptional, IsInt, Min, MaxLength, MinLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ModuleDto {
  @ApiProperty({ description: 'ID языка модуля' })
  @IsInt() @Min(1) @Type(() => Number)
  language_id: number;

  @ApiProperty({ description: 'Название модуля', maxLength: 100 })
  @IsString() @MinLength(3) @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Описание модуля (опц.)', maxLength: 500, required: false })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;
}