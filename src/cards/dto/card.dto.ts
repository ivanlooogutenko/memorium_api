import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExampleCardDto {
  @ApiPropertyOptional({ description: 'Текст примера' })
  @IsOptional() @IsString()
  example_text?: string;

  @ApiPropertyOptional({ description: 'Перевод примера' })
  @IsOptional() @IsString()
  translation_text?: string;
}

export class CardDto {
  @ApiProperty({ description: 'ID модуля, к которому относится карточка' })
  @IsNumber()
  module_id: number;

  @ApiProperty({ description: 'Текст на передней стороне карточки' })
  @IsNotEmpty() @IsString()
  front_text: string;

  @ApiProperty({ description: 'Текст на задней стороне карточки' })
  @IsNotEmpty() @IsString()
  back_text: string;

  @ApiPropertyOptional({ type: [ExampleCardDto], description: 'Список примеров использования' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExampleCardDto)
  examples?: ExampleCardDto[];
}