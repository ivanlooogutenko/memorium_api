import { IsString, IsOptional } from 'class-validator';



export class ModuleDto {

  @IsString()
  user_id: string;
  
  @IsString()
  language_id: string;
  
  @IsString()
  title: string;
  
  @IsOptional()
  @IsString()
  description?: string;
  
}
