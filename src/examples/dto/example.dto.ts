import { IsString, IsOptional, IsInt, Min, MaxLength, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExampleDto {
  @ApiProperty({ description: 'Текст примера', maxLength: 500 })
  @IsNotEmpty() @IsString() @MaxLength(500)
  example_text: string;

  @ApiProperty({ description: 'Перевод (опц.)', maxLength: 500, required: false })
  @IsOptional() @IsString() @MaxLength(500)
  translation_text?: string;

  @ApiProperty({ description: 'URL аудио (опц.)', required: false })
  @IsOptional() @IsString() @IsUrl()
  tts_audio_url?: string;

  @ApiProperty({ description: 'Порядок (опц.)', required: false, minimum: 1 })
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  example_order?: number;
}
