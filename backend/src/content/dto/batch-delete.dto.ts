import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class BatchDeleteDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  ids: string[];
}

