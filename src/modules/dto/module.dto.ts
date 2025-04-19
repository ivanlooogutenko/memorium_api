import { IsString, IsOptional, IsNotEmpty, IsInt, MinLength, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ModuleDto {
  @ApiProperty({
    description: 'ID пользователя, которому принадлежит модуль',
    example: 1,
    required: false,
  })
  @IsOptional() // Будет автоматически заполняться из токена
  @IsNumber({}, { message: 'ID пользователя должен быть числом' })
  @Type(() => Number) // Убедимся, что преобразуется в число
  user_id?: number;
  
  @ApiProperty({
    description: 'ID языка модуля',
    example: 1,
  })
  @IsNotEmpty({ message: 'ID языка обязателен' })
  @IsNumber({}, { message: 'ID языка должен быть числом' })
  @Type(() => Number) // Убедимся, что преобразуется в число
  language_id: number;
  
  @ApiProperty({
    description: 'Название модуля',
    example: 'Немецкий: базовые существительные',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Название модуля обязательно' })
  @IsString({ message: 'Название модуля должно быть строкой' })
  @MinLength(3, { message: 'Название модуля должно содержать минимум 3 символа' })
  @MaxLength(100, { message: 'Название модуля не может превышать 100 символов' })
  title: string;
  
  @ApiProperty({
    description: 'Описание модуля (опционально)',
    example: 'Базовые существительные немецкого языка для начинающих',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Описание модуля должно быть строкой' })
  @MaxLength(500, { message: 'Описание модуля не может превышать 500 символов' })
  description?: string;
}
