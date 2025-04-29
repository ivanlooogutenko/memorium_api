import { IsString, IsOptional, IsNotEmpty, IsUrl, MaxLength, MinLength, ValidateNested, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Новый класс для DTO примера внутри карточки
export class ExampleInputDto {
  @ApiProperty({
    description: 'Текст примера на изучаемом языке',
    example: 'Wie geht es Ihnen?',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Текст примера обязателен' })
  @IsString({ message: 'Текст примера должен быть строкой' })
  @MaxLength(500, { message: 'Текст примера не может превышать 500 символов' })
  example_text: string;

  @ApiProperty({
    description: 'Перевод примера (опционально)',
    example: 'Как у вас дела?',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Перевод примера должен быть строкой' })
  @MaxLength(500, { message: 'Перевод примера не может превышать 500 символов' })
  translation_text?: string;

  // tts_audio_url можно добавить позже, если потребуется генерация аудио для примеров
  // @ApiProperty({
  //   description: 'URL аудио для примера (опционально)',
  //   example: 'https://example.com/audio/wie_geht_es.mp3',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString({ message: 'URL аудио примера должен быть строкой' })
  // @IsUrl({}, { message: 'Некорректный URL аудио примера' })
  // tts_audio_url?: string;
}

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

  @ApiProperty({
    description: 'Список примеров использования (опционально, макс. 10)',
    type: [ExampleInputDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Примеры должны быть массивом' })
  @ArrayMaxSize(10, { message: 'Нельзя добавить больше 10 примеров' })
  @ValidateNested({ each: true })
  @Type(() => ExampleInputDto)
  examples?: ExampleInputDto[];
}
