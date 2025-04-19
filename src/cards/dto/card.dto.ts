import { IsString, IsOptional, IsNotEmpty, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CardDto {
  @ApiProperty({
    description: 'ID модуля, к которому принадлежит карточка',
    example: '1',
  })
  @IsNotEmpty({ message: 'ID модуля обязателен' })
  @IsString({ message: 'ID модуля должен быть строкой' })
  module_id: string;

  @ApiProperty({
    description: 'Текст на лицевой стороне карточки (иностранное слово)',
    example: 'Hund',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Текст на лицевой стороне обязателен' })
  @IsString({ message: 'Текст на лицевой стороне должен быть строкой' })
  @MinLength(1, { message: 'Текст на лицевой стороне не может быть пустым' })
  @MaxLength(255, { message: 'Текст на лицевой стороне не может превышать 255 символов' })
  front_text: string;

  @ApiProperty({
    description: 'Текст на обратной стороне карточки (перевод)',
    example: 'Собака',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Текст на обратной стороне обязателен' })
  @IsString({ message: 'Текст на обратной стороне должен быть строкой' })
  @MinLength(1, { message: 'Текст на обратной стороне не может быть пустым' })
  @MaxLength(255, { message: 'Текст на обратной стороне не может превышать 255 символов' })
  back_text: string;

  @ApiProperty({
    description: 'URL изображения для карточки (опционально)',
    example: 'https://example.com/images/dog.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'URL изображения должен быть строкой' })
  @IsUrl({}, { message: 'Некорректный URL изображения' })
  image_url?: string;

  @ApiProperty({
    description: 'URL аудио произношения для карточки (опционально)',
    example: 'https://example.com/audio/hund.mp3',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'URL аудио должен быть строкой' })
  @IsUrl({}, { message: 'Некорректный URL аудио' })
  tts_audio_url?: string;
}
