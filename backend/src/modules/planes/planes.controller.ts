import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PlanesService } from './planes.service';
import { RegistrarTenantDto } from './dto/registrar-tenant.dto';

@ApiTags('Planes & Registro')
@Controller({ path: 'planes', version: '1' })
export class PlanesController {
  constructor(private readonly svc: PlanesService) {}

  /** Lista de planes para la landing page — público */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener todos los planes disponibles' })
  listar() {
    return this.svc.listarPlanes();
  }

  /** Registro público de nueva empresa — crea tenant + usuario admin */
  @Public()
  @Post('registro')
  @ApiOperation({ summary: 'Registro público de nueva empresa (self-service)' })
  registro(@Body() dto: RegistrarTenantDto) {
    return this.svc.registrarTenant(dto);
  }
}
