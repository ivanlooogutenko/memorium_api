import { IsString, IsOptional, IsInt, Min } from 'class-validator';



export class ExampleDto {

  @IsString()
  example_text: string;

  @IsOptional()
  @IsString()
  translation_text?: string;

  @IsOptional()
  @IsString()
  tts_audio_url?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  example_order?: number;
  
}
