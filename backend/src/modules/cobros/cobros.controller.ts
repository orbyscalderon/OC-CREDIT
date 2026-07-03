import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CobrosService } from './cobros.service';
import { RegistrarCobroDto, CobroResponseDto } from './dto/registrar-cobro.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Rol } from '../../common/constants/roles.enum';

@ApiTags('Cobros')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'cobros', version: '1' })
export class CobrosController {
  constructor(private readonly cobrosService: CobrosService) {}

  /**
   * POST /api/v1/cobros/registrar
   *
   * Endpoint crítico. Registra un cobro de forma atómica:
   *  - Verifica idempotencia por UUID del dispositivo móvil
   *  - Aplica distribución en cascada: Mora → Interés → Capital
   *  - Actualiza estados de cuotas y préstamo dentro de una transacción SERIALIZABLE
   *  - Actualiza totales de la caja del cobrador
   */
  @Post('registrar')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @Throttle({ short: { limit: 5, ttl: 1000 } }) // Máx 5 cobros/seg por cobrador
  @ApiOperation({
    summary: 'Registrar cobro en ruta (atómico + idempotente)',
    description:
      'Procesa el pago aplicando cascada de absorción: 1° Mora, 2° Interés, 3° Capital. ' +
      'El UUID del dispositivo garantiza que un cobro offline no se procese dos veces.',
  })
  @ApiResponse({ status: 201, type: CobroResponseDto, description: 'Cobro procesado exitosamente' })
  @ApiResponse({ status: 409, description: 'UUID duplicado — cobro ya fue procesado' })
  @ApiResponse({ status: 404, description: 'Préstamo o caja no encontrada' })
  @ApiResponse({ status: 403, description: 'Préstamo no asignado a este cobrador' })
  @ApiResponse({ status: 400, description: 'Préstamo sin cuotas pendientes' })
  registrar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegistrarCobroDto,
  ): Promise<CobroResponseDto> {
    const esAdminUSupervisor = user.rol === Rol.ADMIN_TENANT || user.rol === Rol.SUPERVISOR_TENANT;
    return this.cobrosService.registrarCobro(
      user.tenantId,
      user.empleadoId,
      esAdminUSupervisor,
      dto,
    );
  }

  /**
   * GET /api/v1/cobros/caja/:cajaId
   * Lista los cobros realizados en una caja específica del cobrador autenticado.
   */
  @Get('caja/:cajaId')
  @Roles(Rol.COBRADOR_TENANT, Rol.SUPERVISOR_TENANT, Rol.ADMIN_TENANT)
  @ApiOperation({ summary: 'Listar cobros de una caja' })
  @ApiParam({ name: 'cajaId', type: 'string', format: 'uuid' })
  getCobrosDeCaja(
    @CurrentUser() user: JwtPayload,
    @Param('cajaId', ParseUUIDPipe) cajaId: string,
  ) {
    return this.cobrosService.getCobrosDeCaja(
      user.tenantId,
      cajaId,
      user.empleadoId,
    );
  }
}
