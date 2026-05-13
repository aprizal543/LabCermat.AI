import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateResultDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  parameterName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceMin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceMax?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
