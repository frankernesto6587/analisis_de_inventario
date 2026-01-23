'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { MetricsByEntity } from '@/types';

interface EntitiesChartProps {
  data: MetricsByEntity[];
}

export function EntitiesChart({ data }: EntitiesChartProps) {
  const chartData = data.slice(0, 6).map((d) => ({
    entidad: d.entidad.length > 15 ? d.entidad.substring(0, 15) + '...' : d.entidad,
    ventas: d.ventasTotales,
    tickets: d.numeroVentas,
    fullName: d.entidad,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="entidad"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name) => {
              const numValue = Number(value) || 0;
              if (name === 'ventas') return [formatCurrency(numValue), 'Ventas'];
              return [formatNumber(numValue), 'Tickets'];
            }}
            labelFormatter={(label, payload) =>
              (payload?.[0]?.payload as { fullName?: string })?.fullName || String(label)
            }
          />
          <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} name="ventas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
