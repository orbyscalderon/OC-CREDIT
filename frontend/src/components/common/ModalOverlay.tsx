import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Overlay de modal renderizado vía Portal directo a document.body.
 *
 * Sin esto, el modal queda anidado dentro del árbol de AppLayout
 * (h-screen overflow-hidden + main overflow-y-auto) y, según el navegador,
 * su `position: fixed` puede terminar anclado a ese contenedor en vez del
 * viewport real, dejando el título/primeros campos inalcanzables aunque el
 * propio modal tenga scroll interno. El Portal lo saca de ese árbol por
 * completo -- queda como hijo directo de <body>, garantizando que
 * `fixed inset-0` se posicione contra el viewport de verdad.
 */
export function ModalOverlay({ children }: { children: ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4">
      {children}
    </div>,
    document.body,
  );
}
