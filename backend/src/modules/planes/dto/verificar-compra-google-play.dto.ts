import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const PLANES_VALIDOS = ['basico', 'growth', 'pro'];

export class VerificarCompraGooglePlayDto {
  // ID del producto de suscripción configurado en Play Console (ej. "plan_basico")
  @IsNotEmpty() @IsString()
  productId: string;

  // Token que entrega el plugin in_app_purchase de Flutter al completar la compra
  @IsNotEmpty() @IsString()
  purchaseToken: string;

  @IsIn(PLANES_VALIDOS)
  planId: string;
}
