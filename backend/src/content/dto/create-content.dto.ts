import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class CreateContentDto {
  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsString()
  @IsNotEmpty()
  caption: string;
}


