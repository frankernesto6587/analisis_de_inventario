import { format, startOfMonth, startOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  DashboardMetrics,
  MetricsByPeriod,
  MetricsByEntity,
  MetricsByProduct,
  MetricsByPaymentMethod,
  Sale,
  SaleItem,
  Purchase,
  Shrinkage,
  Expense,
  Withdrawal,
  Product,
  FIFOInventoryState,
  DashboardFilters,
} from '@/types';
import { FIFOEngine } from './fifo-engine';

// ============================================
// CALCULADOR DE MÉTRICAS
// ============================================

interface CalculatorInput {
  productos: Product[];
  ventas: Sale[];
  ventasItems: SaleItem[];
  compras: Purchase[];
  mermas: Shrinkage[];
  gastos: Expense[];
  retiros: Withdrawal[];
  fifoState: FIFOInventoryState;
  inventoryValue: number;
  cogs: number;
  shrinkageCost: number;
}

export function calculateMetrics(
  input: CalculatorInput,
  filters?: DashboardFilters
): DashboardMetrics {
  const {
    productos,
    ventas,
    ventasItems,
    compras,
    mermas,
    gastos,
    retiros,
    fifoState,
    inventoryValue,
    cogs,
    shrinkageCost,
  } = input;

  // Aplicar filtros si existen
  let filteredVentas = ventas;
  let filteredItems = ventasItems;
  let filteredMermas = mermas;

  if (filters) {
    if (filters.fechaDesde) {
      filteredVentas = filteredVentas.filter(
        (v) => v.fecha >= filters.fechaDesde!
      );
      filteredMermas = filteredMermas.filter(
        (m) => m.fecha >= filters.fechaDesde!
      );
    }
    if (filters.fechaHasta) {
      filteredVentas = filteredVentas.filter(
        (v) => v.fecha <= filters.fechaHasta!
      );
      filteredMermas = filteredMermas.filter(
        (m) => m.fecha <= filters.fechaHasta!
      );
    }
    if (filters.entidades.length > 0) {
      filteredVentas = filteredVentas.filter(
        (v) => v.entidad && filters.entidades.includes(v.entidad)
      );
      filteredMermas = filteredMermas.filter(
        (m) => filters.entidades.includes(m.entidad)
      );
    }
    if (filters.productos.length > 0) {
      filteredItems = filteredItems.filter((i) =>
        filters.productos.includes(i.productoCodigo)
      );
    }

    // Filtrar items por ventas filtradas
    const ventaIds = new Set(filteredVentas.map((v) => v.id));
    filteredItems = filteredItems.filter((i) => ventaIds.has(i.ventaId));
  }

  // ============================================
  // CÁLCULOS PRINCIPALES
  // ============================================

  // TOTAL VENTAS = suma de Importe CUP (incluye todo convertido a CUP)
  const totalVentasCup = filteredVentas.reduce((sum, v) => sum + v.importeCup, 0);

  // Desglose por método de pago
  const ventasTotales = {
    total: totalVentasCup, // TOTAL EN CUP (todos los métodos)
    usd: filteredVentas.reduce((sum, v) => sum + v.usd, 0),
    euro: filteredVentas.reduce((sum, v) => sum + v.euro, 0),
    cupTransferencia: filteredVentas.reduce((sum, v) => sum + v.cupTransferencia, 0),
    cupEfectivo: filteredVentas.reduce((sum, v) => sum + v.cupEfectivo, 0),
  };

  const numeroVentas = filteredVentas.length;

  const ticketPromedio = {
    cup: numeroVentas > 0 ? totalVentasCup / numeroVentas : 0,
  };

  // Compras totales
  const comprasTotales = {
    usd: compras.reduce((sum, c) => sum + c.importeTotal, 0),
  };

  // Margen bruto (usando total en CUP convertido a USD con tasa aproximada)
  const tasaPromedio = 400; // Tasa CUP/USD aproximada
  const ingresosTotalUsd = totalVentasCup / tasaPromedio;
  const margenBruto = ingresosTotalUsd - cogs;
  const margenPorcentaje = ingresosTotalUsd > 0 ? (margenBruto / ingresosTotalUsd) * 100 : 0;

  // Merma total
  const mermaTotal = filteredMermas.reduce((sum, m) => sum + m.cantidad, 0);

  // Gastos total
  const gastosTotal = gastos.reduce((sum, g) => sum + g.monto, 0);

  // Retiros total
  const retirosTotal = retiros.reduce((sum, r) => sum + r.montoUsd, 0);

  // ============================================
  // MÉTRICAS POR PERIODO (mensual)
  // ============================================

  const porPeriodoMap = new Map<string, MetricsByPeriod>();

  for (const venta of filteredVentas) {
    const periodo = format(venta.fecha, 'yyyy-MM', { locale: es });

    if (!porPeriodoMap.has(periodo)) {
      porPeriodoMap.set(periodo, {
        periodo,
        ventasTotales: 0,
        numeroVentas: 0,
        ticketPromedio: 0,
        cogs: 0,
        margenBruto: 0,
        margenPorcentaje: 0,
        mermaTotal: 0,
        mermaCosto: 0,
      });
    }

    const m = porPeriodoMap.get(periodo)!;
    m.ventasTotales += venta.usd + venta.euro + (venta.importeCup / 400);
    m.numeroVentas += 1;
  }

  // Calcular promedios
  for (const m of porPeriodoMap.values()) {
    m.ticketPromedio = m.numeroVentas > 0 ? m.ventasTotales / m.numeroVentas : 0;
  }

  // Agregar mermas por periodo
  for (const merma of filteredMermas) {
    const periodo = format(merma.fecha, 'yyyy-MM', { locale: es });
    const m = porPeriodoMap.get(periodo);
    if (m) {
      m.mermaTotal += merma.cantidad;
      m.mermaCosto += merma.costoFifo || 0;
    }
  }

  const porPeriodo = Array.from(porPeriodoMap.values()).sort((a, b) =>
    a.periodo.localeCompare(b.periodo)
  );

  // ============================================
  // MÉTRICAS POR ENTIDAD
  // ============================================

  const porEntidadMap = new Map<string, MetricsByEntity>();

  for (const venta of filteredVentas) {
    const entidad = venta.entidad || 'Sin entidad';

    if (!porEntidadMap.has(entidad)) {
      porEntidadMap.set(entidad, {
        entidad,
        ventasTotales: 0,
        numeroVentas: 0,
        margenBruto: 0,
        margenPorcentaje: 0,
      });
    }

    const e = porEntidadMap.get(entidad)!;
    e.ventasTotales += venta.usd + venta.euro + (venta.importeCup / 400);
    e.numeroVentas += 1;
  }

  const porEntidad = Array.from(porEntidadMap.values()).sort(
    (a, b) => b.ventasTotales - a.ventasTotales
  );

  // ============================================
  // MÉTRICAS POR PRODUCTO
  // ============================================

  const porProductoMap = new Map<number, MetricsByProduct>();

  for (const item of filteredItems) {
    if (!porProductoMap.has(item.productoCodigo)) {
      const producto = productos.find((p) => p.codigo === item.productoCodigo);
      porProductoMap.set(item.productoCodigo, {
        codigo: item.productoCodigo,
        producto: item.producto,
        descripcion: item.descripcion || producto?.descripcion || '',
        unidadesVendidas: 0,
        ventasTotales: 0,
        cogs: 0,
        margenBruto: 0,
        margenPorcentaje: 0,
        stockActual: 0,
        valorInventario: 0,
        rotacion: 0,
      });
    }

    const p = porProductoMap.get(item.productoCodigo)!;
    p.unidadesVendidas += Math.abs(item.unidadesTotal);
    p.ventasTotales += (item.precio || 0) * Math.abs(item.cantidad);
    p.cogs += item.costoFifo || 0;
    p.margenBruto = p.ventasTotales - p.cogs;
    p.margenPorcentaje = p.ventasTotales > 0 ? (p.margenBruto / p.ventasTotales) * 100 : 0;
  }

  // Agregar stock actual desde FIFO
  for (const lote of fifoState.lotes) {
    const p = porProductoMap.get(lote.productoCodigo);
    if (p && lote.cantidadDisponible > 0) {
      p.stockActual += lote.cantidadDisponible;
      p.valorInventario += lote.cantidadDisponible * lote.costoUnitario;
    }
  }

  // Calcular rotación
  for (const p of porProductoMap.values()) {
    const stockPromedio = p.stockActual > 0 ? p.stockActual : 1;
    p.rotacion = p.unidadesVendidas / stockPromedio;
  }

  const porProducto = Array.from(porProductoMap.values());

  // Top 10 productos por ventas
  const topProductosVentas = [...porProducto]
    .sort((a, b) => b.ventasTotales - a.ventasTotales)
    .slice(0, 10);

  // Top 10 productos por merma
  const mermasPorProducto = new Map<number, { cantidad: number; costo: number }>();
  for (const merma of filteredMermas) {
    if (!mermasPorProducto.has(merma.productoCodigo)) {
      mermasPorProducto.set(merma.productoCodigo, { cantidad: 0, costo: 0 });
    }
    const m = mermasPorProducto.get(merma.productoCodigo)!;
    m.cantidad += merma.cantidad;
    m.costo += merma.costoFifo || 0;
  }

  const topProductosMerma: MetricsByProduct[] = [];
  for (const [codigo, m] of mermasPorProducto) {
    const producto = porProductoMap.get(codigo) || {
      codigo,
      producto: `Producto ${codigo}`,
      descripcion: '',
      unidadesVendidas: 0,
      ventasTotales: 0,
      cogs: 0,
      margenBruto: 0,
      margenPorcentaje: 0,
      stockActual: 0,
      valorInventario: 0,
      rotacion: 0,
    };
    topProductosMerma.push({
      ...producto,
      unidadesVendidas: m.cantidad,
      cogs: m.costo,
    });
  }
  topProductosMerma.sort((a, b) => b.cogs - a.cogs);

  // ============================================
  // MÉTRICAS POR MEDIO DE PAGO
  // ============================================

  const pagos = {
    USD: { monto: 0, transacciones: 0 },
    EURO: { monto: 0, transacciones: 0 },
    'CUP Transferencia': { monto: 0, transacciones: 0 },
    'CUP Efectivo': { monto: 0, transacciones: 0 },
  };

  for (const venta of filteredVentas) {
    if (venta.usd > 0) {
      pagos.USD.monto += venta.usd;
      pagos.USD.transacciones += 1;
    }
    if (venta.euro > 0) {
      pagos.EURO.monto += venta.euro;
      pagos.EURO.transacciones += 1;
    }
    if (venta.cupTransferencia > 0) {
      pagos['CUP Transferencia'].monto += venta.cupTransferencia;
      pagos['CUP Transferencia'].transacciones += 1;
    }
    if (venta.cupEfectivo > 0) {
      pagos['CUP Efectivo'].monto += venta.cupEfectivo;
      pagos['CUP Efectivo'].transacciones += 1;
    }
  }

  const totalPagos = Object.values(pagos).reduce((sum, p) => sum + p.monto, 0);

  const porMedioPago: MetricsByPaymentMethod[] = Object.entries(pagos).map(
    ([metodo, data]) => ({
      metodo,
      monto: data.monto,
      transacciones: data.transacciones,
      porcentaje: totalPagos > 0 ? (data.monto / totalPagos) * 100 : 0,
    })
  );

  // ============================================
  // METADATA Y FECHAS
  // ============================================

  const fechas = filteredVentas.map((v) => v.fecha);
  const rangoFechas = {
    desde: fechas.length > 0 ? new Date(Math.min(...fechas.map((d) => d.getTime()))) : new Date(),
    hasta: fechas.length > 0 ? new Date(Math.max(...fechas.map((d) => d.getTime()))) : new Date(),
  };

  // Contar lotes activos
  const lotesActivos = fifoState.lotes.filter((l) => l.cantidadDisponible > 0).length;

  // Contar productos con stock negativo
  const productosConStockNegativo = fifoState.warnings.filter(
    (w) => w.tipo === 'STOCK_NEGATIVO'
  ).length;

  return {
    // Resumen general
    ventasTotales,
    numeroVentas,
    ticketPromedio,
    comprasTotales,
    cogs,
    margenBruto,
    margenPorcentaje,
    valorInventario: inventoryValue,
    mermaTotal,
    mermaCosto: shrinkageCost,
    gastosTotal,
    retirosTotal,

    // Desglosados
    porPeriodo,
    porEntidad,
    porProducto,
    porMedioPago,
    topProductosVentas,
    topProductosMerma: topProductosMerma.slice(0, 10),

    // FIFO
    warnings: fifoState.warnings,
    lotesActivos,
    productosConStockNegativo,

    // Metadatos
    rangoFechas,
    totalRegistros: {
      productos: productos.length,
      ventas: filteredVentas.length,
      compras: compras.length,
      recepciones: 0, // Se podría agregar
      mermas: filteredMermas.length,
      gastos: gastos.length,
    },
  };
}
