/**
 * Botón de Google Pay usando la Google Pay Web API.
 *
 * Configuración requerida (variables de entorno):
 *   VITE_GOOGLE_PAY_ENV          = TEST | PRODUCTION  (default: TEST)
 *   VITE_GOOGLE_PAY_MERCHANT_ID  = ID del comercio en Google Pay Business Console
 *   VITE_PLACETOPAY_MERCHANT_ID  = Gateway Merchant ID en PlacetoPay
 *
 * En TEST, el botón aparece con una tarjeta de prueba y no cobra.
 * En PRODUCTION, se requieren credenciales reales de PlacetoPay.
 */

import { useEffect, useRef, useState } from 'react';

// Declaraciones de tipo para la API de Google Pay
interface PaymentsClient {
  isReadyToPay(req: object): Promise<{ result: boolean }>;
  createButton(config: {
    onClick: () => void;
    buttonType?: string;
    buttonColor?: string;
    buttonSizeMode?: string;
  }): HTMLElement;
  loadPaymentData(req: object): Promise<{
    paymentMethodData: {
      tokenizationData: { token: string };
      info?: { cardNetwork: string; cardDetails: string };
    };
  }>;
}

declare global {
  interface Window {
    google?: {
      payments: {
        api: {
          PaymentsClient: new (config: { environment: string }) => PaymentsClient;
        };
      };
    };
  }
}

interface GooglePayButtonProps {
  /** Precio en USD a cobrar */
  amountUsd: number;
  /** Callback con el token de Google Pay cuando el usuario aprueba el pago */
  onPaymentToken: (token: string) => void;
  /** Callback si el usuario cancela o hay un error */
  onError?: (msg: string) => void;
  disabled?: boolean;
}

const GPAY_ENV = (import.meta.env.VITE_GOOGLE_PAY_ENV ?? 'TEST') as 'TEST' | 'PRODUCTION';
const MERCHANT_ID = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID ?? 'BCR2DN4TZHFHWT6I';
const GATEWAY_MERCHANT_ID = import.meta.env.VITE_PLACETOPAY_MERCHANT_ID ?? '';

const ALLOWED_PAYMENT_METHODS = [
  {
    type: 'CARD',
    parameters: {
      allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
      allowedCardNetworks: ['MASTERCARD', 'VISA'],
    },
    tokenizationSpecification: {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'placetopay',
        gatewayMerchantId: GATEWAY_MERCHANT_ID,
      },
    },
  },
];

export function GooglePayButton({ amountUsd, onPaymentToken, onError, disabled }: GooglePayButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<PaymentsClient | null>(null);
  const [ready, setReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Carga el script de Google Pay una sola vez
  useEffect(() => {
    if (document.getElementById('gpay-script')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gpay-script';
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError?.('No se pudo cargar Google Pay');
    document.head.appendChild(script);
  }, []);

  // Inicializa el cliente y verifica disponibilidad
  useEffect(() => {
    if (!scriptLoaded || !window.google?.payments?.api) return;

    const client = new window.google.payments.api.PaymentsClient({ environment: GPAY_ENV });
    clientRef.current = client;

    client
      .isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: ALLOWED_PAYMENT_METHODS.map(({ type, parameters }) => ({
          type,
          parameters,
        })),
      })
      .then(({ result }) => setReady(result))
      .catch(() => setReady(false));
  }, [scriptLoaded]);

  // Renderiza el botón de Google Pay en el contenedor
  useEffect(() => {
    if (!ready || !clientRef.current || !containerRef.current) return;

    containerRef.current.innerHTML = '';

    const btn = clientRef.current.createButton({
      onClick: handleClick,
      buttonType: 'pay',
      buttonColor: 'default',
      buttonSizeMode: 'fill',
    });
    containerRef.current.appendChild(btn);
  }, [ready, disabled, amountUsd]);

  async function handleClick() {
    if (disabled || !clientRef.current) return;

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: ALLOWED_PAYMENT_METHODS,
      merchantInfo: {
        merchantId: MERCHANT_ID,
        merchantName: 'OC Credit — OC Moon Group LLC',
      },
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: amountUsd.toFixed(2),
        currencyCode: 'USD',
        countryCode: 'DO',
      },
    };

    try {
      const paymentData = await clientRef.current.loadPaymentData(paymentDataRequest);
      const token = paymentData.paymentMethodData.tokenizationData.token;
      onPaymentToken(token);
    } catch (err: unknown) {
      // statusCode 'CANCELED' significa que el usuario cerró el modal — no es un error
      const status = (err as { statusCode?: string })?.statusCode;
      if (status !== 'CANCELED') {
        onError?.('Error al procesar el pago con Google Pay');
      }
    }
  }

  if (!ready) return null;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', minHeight: '48px', opacity: disabled ? 0.5 : 1 }}
    />
  );
}
