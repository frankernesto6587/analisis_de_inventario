'use client';

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FIFOWarning } from '@/types';

interface FIFOAlertsProps {
  warnings: FIFOWarning[];
  maxDisplay?: number;
}

export function FIFOAlerts({ warnings, maxDisplay = 5 }: FIFOAlertsProps) {
  if (warnings.length === 0) return null;

  const displayWarnings = warnings.slice(0, maxDisplay);
  const remaining = warnings.length - maxDisplay;

  const getIcon = (tipo: FIFOWarning['tipo']) => {
    switch (tipo) {
      case 'STOCK_NEGATIVO':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'SIN_COSTO':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getBgColor = (tipo: FIFOWarning['tipo']) => {
    switch (tipo) {
      case 'STOCK_NEGATIVO':
        return 'bg-amber-500/5 border-amber-500/20';
      case 'SIN_COSTO':
        return 'bg-red-500/5 border-red-500/20';
      default:
        return 'bg-blue-500/5 border-blue-500/20';
    }
  };

  return (
    <Card title="Alertas FIFO" subtitle={`${warnings.length} inconsistencias detectadas`}>
      <div className="space-y-2">
        {displayWarnings.map((warning, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              getBgColor(warning.tipo)
            )}
          >
            {getIcon(warning.tipo)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">
                {warning.producto}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">{warning.mensaje}</p>
              <p className="text-xs text-zinc-500 mt-1">{warning.referencia}</p>
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <p className="text-center text-xs text-zinc-500 pt-2">
            +{remaining} alertas más
          </p>
        )}
      </div>
    </Card>
  );
}
