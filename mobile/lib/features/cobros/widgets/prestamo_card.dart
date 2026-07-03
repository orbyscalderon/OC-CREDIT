import 'package:flutter/material.dart';
import '../../../data/local/prestamos_cache_dao.dart';
import '../../../core/theme.dart';

class PrestamoCard extends StatelessWidget {
  final PrestamoCache prestamo;
  final VoidCallback onTap;

  const PrestamoCard({super.key, required this.prestamo, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final hasMora = prestamo.tieneMora && prestamo.montoMora > 0;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: hasMora
                    ? AppTheme.danger.withOpacity(0.12)
                    : AppTheme.primary.withOpacity(0.10),
                child: Text(
                  prestamo.clienteNombre.isNotEmpty
                      ? prestamo.clienteNombre[0].toUpperCase()
                      : '?',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: hasMora ? AppTheme.danger : AppTheme.primary,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(prestamo.clienteNombre,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                    Text(prestamo.clienteCedula,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          'RD\$ ${prestamo.cuotaMonto.toStringAsFixed(2)}',
                          style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey.shade700),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${prestamo.cuotasPagadas}/${prestamo.numCuotas} cuotas',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        ),
                      ],
                    ),
                    if (hasMora)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Text(
                          'Mora: RD\$ ${prestamo.montoMora.toStringAsFixed(2)}',
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppTheme.danger,
                              fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
