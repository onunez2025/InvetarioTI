import { IsInt, IsString, IsIn, IsDateString, IsOptional, IsPositive, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCompraDetalleDto {
  @IsInt() @IsPositive() modeloId: number;
  @IsInt() @IsPositive() cantidad: number;
  @IsOptional() @IsNumber() precioUnitario?: number;
}

export class CreateCompraDto {
  @IsInt() @IsPositive()    proveedorId: number;
  @IsString()               numeroDocumento: string;
  @IsIn(['FACTURA','OC','BOLETA','NOTA_INGRESO']) tipoDocumento: string;
  @IsDateString()           fechaDocumento: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCompraDetalleDto)
  detalles: CreateCompraDetalleDto[];
}
