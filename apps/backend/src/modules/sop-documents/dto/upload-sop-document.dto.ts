import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadSopDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
