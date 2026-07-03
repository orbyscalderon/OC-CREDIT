import { Matches, ValidationArguments, ValidationOptions } from 'class-validator';

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida la FORMA de un UUID (8-4-4-4-12 hex) sin exigir los nibbles de
 * versión/variante de RFC 4122. Los UUID v4 reales (generados por Postgres o
 * crypto.randomUUID()) siempre cumplen esta forma, pero también los IDs
 * cosméticos de los datos semilla (ej. "dddddddd-0000-0000-0000-000000000001"),
 * que @IsUUID() rechaza porque sus nibbles de versión/variante son inválidos.
 */
export function IsUuidLike(validationOptions?: ValidationOptions) {
  return Matches(UUID_SHAPE, {
    message: (args: ValidationArguments) => `${args.property} must be a UUID`,
    ...validationOptions,
  });
}
