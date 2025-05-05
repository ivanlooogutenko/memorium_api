import { IsString, IsOptional, IsNotEmpty, IsUrl, MaxLength, MinLength, ValidateNested, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExampleDto {
  @ApiProperty() @IsNotEmpty() @IsString() @MaxLength(500)
  example_text: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500)
  translation_text?: string;
}

export class CardDto {
  @ApiProperty() @IsNotEmpty() @IsString()
  module_id: string;

  @ApiProperty() @IsNotEmpty() @IsString() @MinLength(1) @MaxLength(255)
  front_text: string;

  @ApiProperty() @IsNotEmpty() @IsString() @MinLength(1) @MaxLength(255)
  back_text: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @IsUrl()
  image_url?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() @IsUrl()
  tts_audio_url?: string;

  @ApiProperty({ type: [ExampleDto], required: false })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => ExampleDto)
  examples?: ExampleDto[];
}