'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { MetricsByProduct } from '@/types';

interface TopProductsChartProps {
  data: MetricsByProduct[];
  metric: 'ventas' | 'unidades' | 'margen';
}

export function TopProductsChart({ data, metric }: TopProductsChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    nombre: d.descripcion.length > 20 ? d.descripcion.substring(0, 20) + '...' : d.descripcion,
    valor:
      metric === 'ventas'
        ? d.ventasUsd
        : metric === 'unidades'
        ? d.unidadesVendidas
        : d.margenBruto,
    fullName: d.descripcion,
  }));

  const colors = [
    '#10b981',
    '#14b8a6',
    '#22d3d1',
    '#38bdf8',
    '#60a5fa',
    '#818cf8',
    '#a78bfa',
    '#c084fc',
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis
            type="number"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              metric === 'unidades' ? formatNumber(value) : formatCurrency(value)
            }
          />
          <YAxis
            type="category"
            dataKey="nombre"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#fafafa' }}
            formatter={(value, _name, props) => {
              const numValue = Number(value) || 0;
              const payload = props?.payload as { fullName?: string } | undefined;
              return [
                metric === 'unidades' ? formatNumber(numValue) : formatCurrency(numValue),
                payload?.fullName || '',
              ];
            }}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
