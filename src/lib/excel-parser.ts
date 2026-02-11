import * as XLSX from 'xlsx';
import { parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  Product,
  Purchase,
  Reception,
  Sale,
  SaleItem,
  Shrinkage,
  Expense,
  Withdrawal,
  ParsingError,
} from '@/types';

// ============================================
// UTILIDADES DE PARSING
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const str = String(value).trim();

  // Formato: "3/9/25" o "3/13/25" (M/D/YY)
  const shortMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (shortMatch) {
    const [, month, day, year] = shortMatch;
    const fullYear = parseInt(year) + 2000;
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    return isValid(date) ? date : null;
  }

  // Formato: "20 Jun, 2025" o "01 Mar, 2025"
  const longMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  if (longMatch) {
    const months: Record<string, number> = {
      // Inglés
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      // Español
      ene: 0, abr: 3, ago: 7, dic: 11,
    };
    const [, day, monthStr, year] = longMatch;
    const monthIdx = months[monthStr.toLowerCase()];
    if (monthIdx !== undefined) {
      const date = new Date(parseInt(year), monthIdx, parseInt(day));
      return isValid(date) ? date : null;
    }
  }

  // Formato ISO: "2025-10-20 17:06:28"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValid(date) ? date : null;
  }

  // Intentar parse genérico
  const genericDate = new Date(str);
  return isValid(genericDate) ? genericDate : null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') return isNaN(value) ? null : value;

  const str = String(value)
    .replace(/[$€]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '')
    .trim();

  if (str === '' || str === '-') return null;

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function cleanString(value: unknown): string {
  if (!value) return '';
  return String(value).trim();
}

function normalizeEntity(entity: string): string {
  if (!entity) return '';
  // Normalizar variaciones conocidas
  const normalized = entity.trim();
  if (normalized === 'A.Vagones' || normalized === 'A. Vagones') {
    return 'A. Vagones';
  }
  return normalized;
}

// ============================================
// DETECCIÓN DE ENCABEZADOS
// ============================================

interface HeaderDetection {
  rowIndex: number;
  headers: Map<string, number>; // nombre -> índice columna
}

function detectHeaders(
  data: unknown[][],
  expectedHeaders: string[]
): HeaderDetection {
  const lowerExpected = expectedHeaders.map((h) => h.toLowerCase());

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] || [];
    const rowStrings = row.map((cell) =>
      cleanString(cell).toLowerCase().replace(/[\r\n]+/g, ' ').trim()
    );

    let matchCount = 0;
    const headerMap = new Map<string, number>();

    for (let j = 0; j < rowStrings.length; j++) {
      const cellValue = rowStrings[j];
      if (!cellValue) continue; // Ignorar celdas vacías
      for (const expected of lowerExpected) {
        if (cellValue.includes(expected) || expected.includes(cellValue)) {
          matchCount++;
          // Guardar el nombre original (con mayúsculas)
          const originalName = cleanString(row[j]).replace(/[\r\n]+/g, ' ').trim();
          headerMap.set(originalName, j);
          break;
        }
      }
    }

    // Si encontramos al menos 3 coincidencias, consideramos esta fila como encabezados
    if (matchCount >= 3) {
      return { rowIndex: i, headers: headerMap };
    }
  }

  // Fallback: usar fila 0
  const headerMap = new Map<string, number>();
  const row = data[0] || [];
  row.forEach((cell, idx) => {
    const name = cleanString(cell).replace(/[\r\n]+/g, ' ').trim();
    if (name) headerMap.set(name, idx);
  });

  return { rowIndex: 0, headers: headerMap };
}

function getColumnIndex(
  headers: Map<string, number>,
  ...possibleNames: string[]
): number {
  for (const name of possibleNames) {
    for (const [headerName, idx] of headers) {
      if (!headerName) continue; // Ignorar headers vacíos
      if (
        headerName.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(headerName.toLowerCase())
      ) {
        return idx;
      }
    }
  }
  return -1;
}

// ============================================
// PARSERS POR HOJA
// ============================================

export function parseProductos(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): Product[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  const { rowIndex, headers } = detectHeaders(data, [
    'codigo',
    'producto',
    'descripcion',
    'clase',
    'um',
    'costo',
    'precio',
    'caja',
    'pallet',
    'palet',
    'paquete',
  ]);

  const products: Product[] = [];
  const colCodigo = getColumnIndex(headers, 'codigo');
  const colClase = getColumnIndex(headers, 'clase');
  const colProducto = getColumnIndex(headers, 'producto');
  const colDescripcion = getColumnIndex(headers, 'descripcion');
  const colUM = getColumnIndex(headers, 'um');
  const colCaja = getColumnIndex(headers, 'caja', 'x caja', 'unid caja', 'unidades caja');
  const colPallet = getColumnIndex(headers, 'pallet', 'palet', 'x pallet', 'unid pallet');
  const colCostoUnidad = getColumnIndex(headers, 'costo por unidad', 'costo');
  const colPrecioVenta = getColumnIndex(headers, 'precio venta', 'precio');


  for (let i = rowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const codigo = parseNumber(row[colCodigo]);
    if (codigo === null) continue;

    const producto = cleanString(row[colProducto]);
    const descripcion = cleanString(row[colDescripcion]);
    if (!producto && !descripcion) continue;

    try {
      const factorCaja = parseNumber(row[colCaja]);
      const factorPallet = parseNumber(row[colPallet]);

      products.push({
        codigo,
        clase: cleanString(row[colClase]) || null,
        producto: producto || 'Sin nombre',
        descripcion: descripcion || producto || 'Sin descripción',
        um: cleanString(row[colUM]) || 'u',
        factorCaja,
        factorPallet,
        costoUnitario: parseNumber(row[colCostoUnidad]),
        precioVenta: parseNumber(row[colPrecioVenta]),
      });
    } catch {
      errors.push({
        hoja: 'Productos',
        fila: i + 1,
        columna: '-',
        mensaje: 'Error parseando producto',
        valorOriginal: row,
      });
    }
  }

  return products;
}

export function parseVentas(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): { ventas: Sale[]; items: SaleItem[] } {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  const { rowIndex, headers } = detectHeaders(data, [
    'no',
    'factura',
    'fecha',
    'entidad',
    'codigo',
    'producto',
    'cantidad',
    'precio',
    'usd',
    'cup',
    'um',
    'unidades',
    'gestor',
    'comision',
    'importe',
  ]);

  const ventasMap = new Map<string, Sale>();
  const items: SaleItem[] = [];

  const colNo = getColumnIndex(headers, 'no');
  const colFactura = getColumnIndex(headers, 'factura');
  const colFecha = getColumnIndex(headers, 'fecha');
  const colEntidad = getColumnIndex(headers, 'entidad');
  const colCliente = getColumnIndex(headers, 'nombre', 'cliente', 'apellidos');
  const colCodigo = getColumnIndex(headers, 'codigo');
  const colProducto = getColumnIndex(headers, 'producto');
  const colDescripcion = getColumnIndex(headers, 'descripcion');
  const colCantidad = getColumnIndex(headers, 'cantidad');
  const colUM = getColumnIndex(headers, 'um');
  const colGestor = getColumnIndex(headers, 'gestor');
  const colComision = getColumnIndex(headers, 'comision', 'comisión');
  const colPrecio = getColumnIndex(headers, 'precio');
  const colUSD = getColumnIndex(headers, 'usd');
  const colTasaUSD = getColumnIndex(headers, 'tasa usd');
  const colEURO = getColumnIndex(headers, 'euro');
  const colTasaEURO = getColumnIndex(headers, 'tasa euro');
  const colCUPTransf = getColumnIndex(headers, 'cup transferencia', 'transferencia');
  const colCUPEfectivo = getColumnIndex(headers, 'cup efectivo', 'efectivo');
  const colImporteCUP = getColumnIndex(headers, 'importe cup', 'importe');
  const colUnidadesTotal = getColumnIndex(headers, 'unidades total', 'total');

  for (let i = rowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const fecha = parseDate(row[colFecha]);
    if (!fecha) continue;

    const codigo = parseNumber(row[colCodigo]);
    if (codigo === null) continue;

    const cantidad = parseNumber(row[colCantidad]);
    if (cantidad === null) continue;

    const factura = cleanString(row[colFactura]);
    const entidad = normalizeEntity(cleanString(row[colEntidad]));

    // Crear ID único para la venta (Factura + Fecha + Entidad)
    const fechaStr = fecha.toISOString().split('T')[0];
    const ventaKey = `${factura || 'SIN'}_${fechaStr}_${entidad || 'SIN'}`;

    // Obtener o crear la venta
    if (!ventasMap.has(ventaKey)) {
      ventasMap.set(ventaKey, {
        id: generateId(),
        factura: factura || null,
        fecha,
        entidad: entidad || null,
        cliente: cleanString(row[colCliente]) || null,
        gestor: cleanString(row[colGestor]) || null,
        comision: 0,
        usd: 0,
        tasaUsd: null,
        euro: 0,
        tasaEuro: null,
        cupTransferencia: 0,
        cupEfectivo: 0,
        importeCup: 0,
      });
    }

    const venta = ventasMap.get(ventaKey)!;

    // Actualizar datos de pago - SUMAR cada línea
    const usd = parseNumber(row[colUSD]);
    const euro = parseNumber(row[colEURO]);
    const cupTransf = parseNumber(row[colCUPTransf]);
    const cupEfec = parseNumber(row[colCUPEfectivo]);
    const importeCup = parseNumber(row[colImporteCUP]);
    const comision = parseNumber(row[colComision]);

    // Sumar pagos de cada línea (incluir valores negativos para reembolsos)
    if (usd && usd !== 0) {
      venta.usd += usd;
      // Guardar última tasa encontrada
      const tasa = parseNumber(row[colTasaUSD]);
      if (tasa) venta.tasaUsd = tasa;
    }
    if (euro && euro !== 0) {
      venta.euro += euro;
      const tasa = parseNumber(row[colTasaEURO]);
      if (tasa) venta.tasaEuro = tasa;
    }
    if (cupTransf && cupTransf !== 0) {
      venta.cupTransferencia += cupTransf;
    }
    if (cupEfec && cupEfec !== 0) {
      venta.cupEfectivo += cupEfec;
    }
    // Importe CUP = suma de todos los importes de cada línea (TOTAL VENTA)
    // Incluir valores negativos para que reembolsos cancelen correctamente
    if (importeCup && importeCup !== 0) {
      venta.importeCup += importeCup;
    }
    if (comision && comision !== 0) {
      venta.comision += comision;
    }

    // Actualizar cliente y gestor si está vacío
    const cliente = cleanString(row[colCliente]);
    const gestor = cleanString(row[colGestor]);
    if (cliente && !venta.cliente) venta.cliente = cliente;
    if (gestor && !venta.gestor) venta.gestor = gestor;

    // Crear item de venta
    // Si cantidad es negativa (devolución), unidadesTotal también debe ser negativo
    let unidadesTotal = parseNumber(row[colUnidadesTotal]) || Math.abs(cantidad);
    if (cantidad < 0 && unidadesTotal > 0) {
      unidadesTotal = -unidadesTotal; // Preservar signo negativo para devoluciones
    }

    const umValue = cleanString(row[colUM]) || 'u';

    items.push({
      id: generateId(),
      ventaId: venta.id,
      productoCodigo: codigo,
      producto: cleanString(row[colProducto]) || 'Sin nombre',
      descripcion: cleanString(row[colDescripcion]) || '',
      cantidad,
      um: umValue,
      precio: parseNumber(row[colPrecio]),
      unidadesTotal,
      costoFifo: null,
      margenBruto: null,
    });
  }

  return {
    ventas: Array.from(ventasMap.values()),
    items,
  };
}

export function parseCompras(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): Purchase[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  // Buscar encabezados en las primeras 20 filas
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] || [];
    const rowStr = row.map((c) => cleanString(c).toLowerCase()).join(' ');
    if (
      rowStr.includes('fecha') ||
      rowStr.includes('proveedor') ||
      rowStr.includes('producto')
    ) {
      headerRow = i;
      break;
    }
  }

  // Si no encontramos, intentamos detectar por primera fila con datos numéricos secuenciales
  if (headerRow === -1) {
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i] || [];
      const firstCell = parseNumber(row[0]);
      const nextRow = data[i + 1] || [];
      const nextFirstCell = parseNumber(nextRow[0]);
      if (
        firstCell !== null &&
        nextFirstCell !== null &&
        nextFirstCell === firstCell + 1
      ) {
        headerRow = i - 1;
        break;
      }
    }
  }

  if (headerRow === -1) headerRow = 0;

  const purchases: Purchase[] = [];

  // Mapear columnas por posición basada en el análisis previo
  // Estructura detectada: No, Fecha, Proveedor, Codigo, Producto, Descripcion, Precio, Moneda, Cantidad, Empaque, Importe, Tasa, ImporteConv, Unidades
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const numero = parseNumber(row[0]);
    if (numero === null) continue;

    const fecha = parseDate(row[1]);
    if (!fecha) continue;

    const proveedor = cleanString(row[2]);
    const codigo = parseNumber(row[3]);
    if (codigo === null) continue;

    const producto = cleanString(row[4]);
    const descripcion = cleanString(row[5]);
    const precioStr = cleanString(row[6]);
    const precioUnitario = parseNumber(precioStr);
    const moneda = cleanString(row[7]) || 'USD';
    const cantidad = parseNumber(row[8]);
    const empaque = cleanString(row[9]) || 'Caja';
    const importeStr = cleanString(row[10]);
    const importeTotal = parseNumber(importeStr);
    const tasa = parseNumber(row[11]);
    const unidades = parseNumber(row[13]) || (cantidad || 0);

    if (cantidad === null || importeTotal === null) continue;

    purchases.push({
      id: generateId(),
      numero,
      fecha,
      proveedor: proveedor || 'Sin proveedor',
      productoCodigo: codigo,
      producto: producto || 'Sin nombre',
      descripcion: descripcion || producto || '',
      precioUnitario: precioUnitario || 0,
      moneda,
      cantidad,
      empaque,
      importeTotal,
      tasa,
      unidades,
    });
  }

  return purchases;
}

export function parseRecepciones(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): Reception[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  // Similar lógica de detección de encabezados
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] || [];
    const firstCell = parseNumber(row[0]);
    const nextRow = data[i + 1] || [];
    const nextFirstCell = parseNumber(nextRow[0]);
    if (
      firstCell !== null &&
      nextFirstCell !== null &&
      nextFirstCell === firstCell + 1
    ) {
      headerRow = i - 1;
      break;
    }
  }

  if (headerRow === -1) headerRow = 0;

  const receptions: Reception[] = [];

  // Estructura: No, Fecha, Proveedor, Codigo, Producto, Descripcion, Cantidad, Empaque, Unidades
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const numero = parseNumber(row[0]);
    if (numero === null) continue;

    const fecha = parseDate(row[1]);
    if (!fecha) continue;

    const proveedor = cleanString(row[2]);
    const codigo = parseNumber(row[3]);
    if (codigo === null) continue;

    const producto = cleanString(row[4]);
    const descripcion = cleanString(row[5]);
    const cantidad = parseNumber(row[6]);
    const empaque = cleanString(row[7]) || 'Caja';
    const unidades = parseNumber(row[8]) || (cantidad || 0);

    if (cantidad === null) continue;

    receptions.push({
      id: generateId(),
      numero,
      fecha,
      proveedor: proveedor || 'Sin proveedor',
      productoCodigo: codigo,
      producto: producto || 'Sin nombre',
      descripcion: descripcion || producto || '',
      cantidad,
      empaque,
      unidades,
      compraNumero: null, // Se vinculará después
      costoUnitario: null, // Se calculará desde compras
    });
  }

  return receptions;
}

export function parseMermas(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): Shrinkage[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  const { rowIndex, headers } = detectHeaders(data, [
    'fecha',
    'entidad',
    'codigo',
    'producto',
    'cantidad',
  ]);

  const mermas: Shrinkage[] = [];
  const colFecha = getColumnIndex(headers, 'fecha');
  const colEntidad = getColumnIndex(headers, 'entidad');
  const colCodigo = getColumnIndex(headers, 'codigo');
  const colProducto = getColumnIndex(headers, 'producto');
  const colDescripcion = getColumnIndex(headers, 'descripcion');
  const colCantidad = getColumnIndex(headers, 'cantidad');
  const colUM = getColumnIndex(headers, 'um');

  for (let i = rowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const fecha = parseDate(row[colFecha]);
    if (!fecha) continue;

    const codigo = parseNumber(row[colCodigo]);
    if (codigo === null) continue;

    const cantidad = parseNumber(row[colCantidad]);
    if (cantidad === null || cantidad === 0) continue;

    mermas.push({
      id: generateId(),
      fecha,
      entidad: normalizeEntity(cleanString(row[colEntidad])) || 'Sin entidad',
      productoCodigo: codigo,
      producto: cleanString(row[colProducto]) || 'Sin nombre',
      descripcion: cleanString(row[colDescripcion]) || '',
      cantidad: Math.abs(cantidad),
      um: cleanString(row[colUM]) || 'u',
      costoFifo: null, // Se calculará con FIFO
    });
  }

  return mermas;
}

export function parseGastos(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): Expense[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  // Buscar inicio de datos
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] || [];
    const firstCell = parseNumber(row[0]);
    const nextRow = data[i + 1] || [];
    const nextFirstCell = parseNumber(nextRow[0]);
    if (
      firstCell !== null &&
      nextFirstCell !== null &&
      nextFirstCell === firstCell + 1
    ) {
      headerRow = i - 1;
      break;
    }
  }

  if (headerRow === -1) headerRow = 0;

  const gastos: Expense[] = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const numero = parseNumber(row[0]);
    if (numero === null) continue;

    const fecha = parseDate(row[1]);
    if (!fecha) continue;

    const categoria = cleanString(row[2]);
    const descripcion = cleanString(row[3]);
    const monto = parseNumber(row[4]);
    const moneda = cleanString(row[5]) || 'CUP';

    if (monto === null) continue;

    gastos.push({
      id: generateId(),
      numero,
      fecha,
      categoria: categoria || 'Otros',
      descripcion: descripcion || 'Sin descripción',
      monto,
      moneda,
    });
  }

  return gastos;
}

export function parseRetiros(
  sheet: XLSX.WorkSheet,
  errors: ParsingError[]
): Withdrawal[] {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  const { rowIndex, headers } = detectHeaders(data, [
    'no',
    'fecha',
    'accionista',
    'moneda',
    'monto',
    'tasa',
    'retiros',
  ]);

  const retiros: Withdrawal[] = [];
  const colNo = getColumnIndex(headers, 'no');
  const colFecha = getColumnIndex(headers, 'fecha');
  const colAccionista = getColumnIndex(headers, 'accionista');
  const colMoneda = getColumnIndex(headers, 'moneda');
  const colMonto = getColumnIndex(headers, 'monto');
  const colTasa = getColumnIndex(headers, 'tasa');
  const colRetiroUSD = getColumnIndex(headers, 'retiros', 'usd');

  for (let i = rowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const numero = parseNumber(row[colNo >= 0 ? colNo : 0]);
    if (numero === null) continue;

    const fecha = parseDate(row[colFecha >= 0 ? colFecha : 1]);
    if (!fecha) continue;

    const monto = parseNumber(row[colMonto >= 0 ? colMonto : 5]);
    if (monto === null) continue;

    const tasa = parseNumber(row[colTasa >= 0 ? colTasa : 6]) || 1;
    const montoUsd = parseNumber(row[colRetiroUSD >= 0 ? colRetiroUSD : 7]) || monto / tasa;

    retiros.push({
      id: generateId(),
      numero,
      fecha,
      accionista: cleanString(row[colAccionista >= 0 ? colAccionista : 2]) || 'Sin nombre',
      moneda: cleanString(row[colMoneda >= 0 ? colMoneda : 4]) || 'CUP',
      monto,
      tasa,
      montoUsd,
    });
  }

  return retiros;
}

// ============================================
// PARSER PRINCIPAL
// ============================================

export interface ParsedExcelData {
  productos: Product[];
  ventas: Sale[];
  ventasItems: SaleItem[];
  compras: Purchase[];
  recepciones: Reception[];
  mermas: Shrinkage[];
  gastos: Expense[];
  retiros: Withdrawal[];
  hojasDetectadas: string[];
  errores: ParsingError[];
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedExcelData {
  const workbook = XLSX.read(buffer, { cellDates: true });
  const errors: ParsingError[] = [];

  const result: ParsedExcelData = {
    productos: [],
    ventas: [],
    ventasItems: [],
    compras: [],
    recepciones: [],
    mermas: [],
    gastos: [],
    retiros: [],
    hojasDetectadas: workbook.SheetNames,
    errores: errors,
  };

  // Buscar hojas por nombre (case-insensitive, parcial)
  const findSheet = (...names: string[]): XLSX.WorkSheet | null => {
    for (const name of names) {
      const found = workbook.SheetNames.find((sn) =>
        sn.toLowerCase().includes(name.toLowerCase())
      );
      if (found) return workbook.Sheets[found];
    }
    return null;
  };

  // Parsear cada tipo de hoja
  const productosSheet = findSheet('productos', 'producto');
  if (productosSheet) {
    result.productos = parseProductos(productosSheet, errors);
  }

  const ventasSheet = findSheet('ventas', 'venta');
  if (ventasSheet) {
    const { ventas, items } = parseVentas(ventasSheet, errors);
    result.ventas = ventas;
    result.ventasItems = items;
  }

  const comprasSheet = findSheet('compra');
  if (comprasSheet) {
    result.compras = parseCompras(comprasSheet, errors);
  }

  const recepcionSheet = findSheet('recepcion', 'recepción');
  if (recepcionSheet) {
    result.recepciones = parseRecepciones(recepcionSheet, errors);
  }

  const deterioroSheet = findSheet('deterioro', 'merma');
  if (deterioroSheet) {
    result.mermas = parseMermas(deterioroSheet, errors);
  }

  const gastosSheet = findSheet('gastos', 'gasto');
  if (gastosSheet) {
    result.gastos = parseGastos(gastosSheet, errors);
  }

  const retirosSheet = findSheet('retiros', 'retiro');
  if (retirosSheet) {
    result.retiros = parseRetiros(retirosSheet, errors);
  }

  return result;
}
