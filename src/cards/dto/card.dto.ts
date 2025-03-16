import { IsString, IsOptional } from 'class-validator';

export class CardDto {

  @IsString()
  module_id: string;

  @IsString()
  front_text: string;

  @IsString()
  back_text: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  tts_audio_url?: string;
  
}
