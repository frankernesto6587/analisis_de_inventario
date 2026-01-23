'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { MetricsByPaymentMethod } from '@/types';

interface PaymentMethodsChartProps {
  data: MetricsByPaymentMethod[];
}

const COLORS = ['#10b981', '#22d3d1', '#f59e0b', '#ef4444'];

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const chartData = data.filter((d) => d.monto > 0);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="monto"
            nameKey="metodo"
            label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value, name) => [
              formatCurrency(Number(value) || 0),
              String(name),
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-zinc-400">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
