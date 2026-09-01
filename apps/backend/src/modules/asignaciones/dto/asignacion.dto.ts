import { IsInt, IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateAsignacionDto {
  @IsInt()
  equipoId: number;

  @IsInt()
  colaboradorId: number;

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}

export class DevolucionDto {
  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
