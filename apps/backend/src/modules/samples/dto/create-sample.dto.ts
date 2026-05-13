import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SamplePriority } from '@prisma/client';

export class CreateSampleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sampleType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  requestedTest!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsEnum(SamplePriority)
  priority?: SamplePriority;

  @IsOptional()
  @IsString()
  notes?: string;
}
