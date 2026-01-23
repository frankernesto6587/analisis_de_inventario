import { z } from 'zod';

// ============================================
// ESQUEMAS DE DATOS NORMALIZADOS
// ============================================

// Producto normalizado
export const ProductSchema = z.object({
  codigo: z.number(),
  clase: z.string().nullable(),
  producto: z.string(),
  descripcion: z.string(),
  um: z.string().default('u'),
  factorCaja: z.number().nullable(),
  factorPallet: z.number().nullable(),
  costoUnitario: z.number().nullable(),
  precioVenta: z.number().nullable(),
});
export type Product = z.infer<typeof ProductSchema>;

// Lote FIFO
export const FIFOLotSchema = z.object({
  id: z.string(),
  productoCodigo: z.number(),
  fechaEntrada: z.date(),
  cantidadInicial: z.number(),
  cantidadDisponible: z.number(),
  costoUnitario: z.number(),
  referenciaOrigen: z.string(), // "RECEPCION-123" o "INVENTARIO_INICIAL"
  proveedor: z.string().nullable(),
});
export type FIFOLot = z.infer<typeof FIFOLotSchema>;

// Consumo FIFO (para auditoría)
export const FIFOConsumptionSchema = z.object({
  id: z.string(),
  loteId: z.string(),
  productoCodigo: z.number(),
  fechaSalida: z.date(),
  cantidad: z.number(),
  costoUnitario: z.number(),
  costoTotal: z.number(),
  tipoSalida: z.enum(['VENTA', 'MERMA', 'AJUSTE']),
  referenciaSalida: z.string(),
});
export type FIFOConsumption = z.infer<typeof FIFOConsumptionSchema>;

// Venta (cabecera)
export const SaleSchema = z.object({
  id: z.string(),
  factura: z.string().nullable(),
  fecha: z.date(),
  entidad: z.string().nullable(),
  cliente: z.string().nullable(),
  gestor: z.string().nullable(),
  comision: z.number().default(0),
  // Pagos por moneda
  usd: z.number().default(0),
  tasaUsd: z.number().nullable(),
  euro: z.number().default(0),
  tasaEuro: z.number().nullable(),
  cupTransferencia: z.number().default(0),
  cupEfectivo: z.number().default(0),
  importeCup: z.number().default(0),
});
export type Sale = z.infer<typeof SaleSchema>;

// Venta Item (detalle)
export const SaleItemSchema = z.object({
  id: z.string(),
  ventaId: z.string(),
  productoCodigo: z.number(),
  producto: z.string(),
  descripcion: z.string(),
  cantidad: z.number(),
  um: z.string(),
  precio: z.number().nullable(),
  unidadesTotal: z.number(),
  // FIFO calculado
  costoFifo: z.number().nullable(),
  margenBruto: z.number().nullable(),
});
export type SaleItem = z.infer<typeof SaleItemSchema>;

// Compra
export const PurchaseSchema = z.object({
  id: z.string(),
  numero: z.number(),
  fecha: z.date(),
  proveedor: z.string(),
  productoCodigo: z.number(),
  producto: z.string(),
  descripcion: z.string(),
  precioUnitario: z.number(),
  moneda: z.string(),
  cantidad: z.number(),
  empaque: z.string(),
  importeTotal: z.number(),
  tasa: z.number().nullable(),
  unidades: z.number(),
});
export type Purchase = z.infer<typeof PurchaseSchema>;

// Recepción (entrada física)
export const ReceptionSchema = z.object({
  id: z.string(),
  numero: z.number(),
  fecha: z.date(),
  proveedor: z.string(),
  productoCodigo: z.number(),
  producto: z.string(),
  descripcion: z.string(),
  cantidad: z.number(),
  empaque: z.string(),
  unidades: z.number(),
  // Vinculado a compra para obtener costo
  compraNumero: z.number().nullable(),
  costoUnitario: z.number().nullable(),
});
export type Reception = z.infer<typeof ReceptionSchema>;

// Merma/Deterioro
export const ShrinkageSchema = z.object({
  id: z.string(),
  fecha: z.date(),
  entidad: z.string(),
  productoCodigo: z.number(),
  producto: z.string(),
  descripcion: z.string(),
  cantidad: z.number(),
  um: z.string(),
  // FIFO calculado
  costoFifo: z.number().nullable(),
});
export type Shrinkage = z.infer<typeof ShrinkageSchema>;

// Gasto
export const ExpenseSchema = z.object({
  id: z.string(),
  numero: z.number(),
  fecha: z.date(),
  categoria: z.string(),
  descripcion: z.string(),
  monto: z.number(),
  moneda: z.string(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

// Retiro de accionista
export const WithdrawalSchema = z.object({
  id: z.string(),
  numero: z.number(),
  fecha: z.date(),
  accionista: z.string(),
  moneda: z.string(),
  monto: z.number(),
  tasa: z.number(),
  montoUsd: z.number(),
});
export type Withdrawal = z.infer<typeof WithdrawalSchema>;

// ============================================
// ESTADO DEL INVENTARIO FIFO
// ============================================

export interface FIFOInventoryState {
  lotes: FIFOLot[];
  consumos: FIFOConsumption[];
  warnings: FIFOWarning[];
}

export interface FIFOWarning {
  tipo: 'STOCK_NEGATIVO' | 'SIN_COSTO' | 'FECHA_INCONSISTENTE';
  productoCodigo: number;
  producto: string;
  mensaje: string;
  fecha: Date;
  referencia: string;
}

// ============================================
// MÉTRICAS Y KPIs
// ============================================

export interface MetricsByPeriod {
  periodo: string;
  ventasTotales: number;
  numeroVentas: number;
  ticketPromedio: number;
  cogs: number; // Cost of Goods Sold (FIFO)
  margenBruto: number;
  margenPorcentaje: number;
  mermaTotal: number;
  mermaCosto: number;
}

export interface MetricsByEntity {
  entidad: string;
  ventasTotales: number;
  numeroVentas: number;
  margenBruto: number;
  margenPorcentaje: number;
}

export interface MetricsByProduct {
  codigo: number;
  producto: string;
  descripcion: string;
  unidadesVendidas: number;
  ventasTotales: number;
  cogs: number;
  margenBruto: number;
  margenPorcentaje: number;
  stockActual: number;
  valorInventario: number;
  rotacion: number; // Unidades vendidas / Stock promedio
}

export interface MetricsByPaymentMethod {
  metodo: string;
  monto: number;
  transacciones: number;
  porcentaje: number;
}

export interface DashboardMetrics {
  // Resumen general
  ventasTotales: {
    total: number; // TOTAL EN CUP (todos los métodos de pago)
    usd: number;
    euro: number;
    cupTransferencia: number;
    cupEfectivo: number;
  };
  numeroVentas: number;
  ticketPromedio: { cup: number };
  comprasTotales: { usd: number };
  cogs: number;
  margenBruto: number;
  margenPorcentaje: number;
  valorInventario: number;
  mermaTotal: number;
  mermaCosto: number;
  gastosTotal: number;
  retirosTotal: number;

  // Desglosados
  porPeriodo: MetricsByPeriod[];
  porEntidad: MetricsByEntity[];
  porProducto: MetricsByProduct[];
  porMedioPago: MetricsByPaymentMethod[];
  topProductosVentas: MetricsByProduct[];
  topProductosMerma: MetricsByProduct[];

  // FIFO
  warnings: FIFOWarning[];
  lotesActivos: number;
  productosConStockNegativo: number;

  // Metadatos (fechas pueden ser string después de serialización JSON)
  rangoFechas: { desde: Date | string; hasta: Date | string };
  totalRegistros: {
    productos: number;
    ventas: number;
    compras: number;
    recepciones: number;
    mermas: number;
    gastos: number;
  };
}

// ============================================
// DATOS NORMALIZADOS COMPLETOS
// ============================================

export interface NormalizedData {
  productos: Product[];
  ventas: Sale[];
  ventasItems: SaleItem[];
  compras: Purchase[];
  recepciones: Reception[];
  mermas: Shrinkage[];
  gastos: Expense[];
  retiros: Withdrawal[];
  fifoState: FIFOInventoryState;
  metadata: {
    archivoHash: string;
    fechaProcesamiento: Date;
    hojasDetectadas: string[];
    erroresParsing: ParsingError[];
  };
}

export interface ParsingError {
  hoja: string;
  fila: number;
  columna: string;
  mensaje: string;
  valorOriginal: unknown;
}

// ============================================
// FILTROS DEL DASHBOARD
// ============================================

export interface DashboardFilters {
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  entidades: string[];
  productos: number[];
  mediosPago: string[];
}
