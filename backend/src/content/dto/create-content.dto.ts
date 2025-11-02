import { IsArray, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateContentDto {
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  caption: string;
}


