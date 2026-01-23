'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { MetricsByPeriod } from '@/types';

interface SalesChartProps {
  data: MetricsByPeriod[];
}

export function SalesChart({ data }: SalesChartProps) {
  const chartData = data.map((d) => ({
    periodo: d.periodo.substring(5), // MM
    ventas: d.ventasTotales,
    margen: d.margenBruto,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="periodo"
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
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value) => [formatCurrency(Number(value) || 0), '']}
          />
          <Area
            type="monotone"
            dataKey="ventas"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorVentas)"
            name="Ventas"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
