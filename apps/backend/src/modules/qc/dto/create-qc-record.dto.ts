import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumberString,
  MaxLength,
} from 'class-validator';

export class CreateQcRecordDto {
  @IsString()
  @IsNotEmpty()
  instrumentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  controlType!: string;

  @IsNumberString()
  controlValue!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsNumberString()
  lowerLimit!: string;

  @IsNumberString()
  upperLimit!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}
