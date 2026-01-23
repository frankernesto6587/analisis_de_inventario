'use client';

import { useState } from 'react';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';

interface FormattedNumberProps {
  value: number;
  className?: string;
}

interface FormattedCurrencyProps {
  value: number;
  currency?: string;
  className?: string;
}

interface FormattedPercentProps {
  value: number;
  className?: string;
}

// Formato de numero exacto para tooltip
function exactNumber(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

// Formato de moneda exacto para tooltip
function exactCurrency(value: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    EURO: '€',
    CUP: 'CUP ',
  };
  const symbol = symbols[currency.toUpperCase()] || '$';
  return `${symbol}${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Componente de Tooltip personalizado
function Tooltip({
  children,
  content,
  show
}: {
  children: React.ReactNode;
  content: string;
  show: boolean;
}) {
  return (
    <span className="relative inline-block">
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <span className="block whitespace-nowrap rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-base font-semibold text-white shadow-lg">
            {content}
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-zinc-800 border-r border-b border-zinc-600" />
        </span>
      )}
    </span>
  );
}

export function FormattedNumber({ value, className }: FormattedNumberProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatted = formatNumber(value);
  const exact = exactNumber(value);
  const isAbbreviated = formatted.includes('K') || formatted.includes('M');

  if (!isAbbreviated) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <Tooltip content={exact} show={showTooltip}>
      <span
        className={className}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {formatted}
      </span>
    </Tooltip>
  );
}

export function FormattedCurrency({ value, currency = 'USD', className }: FormattedCurrencyProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatted = formatCurrency(value, currency);
  const exact = exactCurrency(value, currency);
  const isAbbreviated = formatted.includes('K') || formatted.includes('M');

  if (!isAbbreviated) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <Tooltip content={exact} show={showTooltip}>
      <span
        className={className}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {formatted}
      </span>
    </Tooltip>
  );
}

export function FormattedPercent({ value, className }: FormattedPercentProps) {
  return (
    <span className={className}>
      {formatPercent(value)}
    </span>
  );
}
