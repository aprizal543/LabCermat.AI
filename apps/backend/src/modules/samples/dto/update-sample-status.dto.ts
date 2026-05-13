import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SampleStatus } from '@prisma/client';

export class UpdateSampleStatusDto {
  @IsEnum(SampleStatus)
  @IsNotEmpty()
  status!: SampleStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
