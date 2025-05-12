import { IsString, IsOptional, IsInt, Min, MaxLength, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExampleDto {
  @ApiProperty({ description: 'Текст примера', maxLength: 500 })
  @IsNotEmpty() @IsString() @MaxLength(500)
  example_text: string;

  @ApiPropertyOptional({ description: 'Перевод примера', maxLength: 500, required: false })
  @IsOptional() @IsString() @MaxLength(500)
  translation_text?: string;

  @ApiPropertyOptional({ description: 'Порядок примера', minimum: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  example_order?: number;
}
