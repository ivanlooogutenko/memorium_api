import { IsString, IsOptional, IsInt, Min, IsNotEmpty, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExampleDto {
  @ApiProperty({
    description: 'Текст примера использования слова',
    example: 'Der Hund schläft auf dem Sofa.',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Текст примера обязателен' })
  @IsString({ message: 'Текст примера должен быть строкой' })
  @MaxLength(500, { message: 'Текст примера не может превышать 500 символов' })
  example_text: string;

  @ApiProperty({
    description: 'Перевод примера (опционально)',
    example: 'Собака спит на диване.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Перевод примера должен быть строкой' })
  @MaxLength(500, { message: 'Перевод примера не может превышать 500 символов' })
  translation_text?: string;

  @ApiProperty({
    description: 'URL аудио произношения примера (опционально)',
    example: 'https://example.com/audio/der_hund_schlaft.mp3',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'URL аудио должен быть строкой' })
  @IsUrl({}, { message: 'Некорректный URL аудио' })
  tts_audio_url?: string;

  @ApiProperty({
    description: 'Порядковый номер примера (опционально)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Порядковый номер должен быть целым числом' })
  @Min(1, { message: 'Порядковый номер должен быть не меньше 1' })
  @Type(() => Number)
  example_order?: number;
}
