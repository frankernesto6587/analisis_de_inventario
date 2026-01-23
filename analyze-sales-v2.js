const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ANÁLISIS DE INVENTARIO.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Ventas'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

const headerRow = data[0];

// Índices de columnas
const cols = {
  factura: 1,
  fecha: 2,
  entidad: 3,
  cliente: 4,
  codigo: 5,
  producto: 6,
  descripcion: 7,
  cantidad: 8,
  precio: 12,
  usd: 13,
  tasaUsd: 14,
  euro: 15,
  tasaEuro: 16,
  cupTransf: 17,
  cupEfec: 19,
  importeCup: 20,
};

// Buscar facturas con múltiples líneas Y múltiples formas de pago
const facturaData = new Map();

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;

  const factura = row[cols.factura];
  if (!factura || factura === '-' || factura === 'S/F') continue;

  if (!facturaData.has(factura)) {
    facturaData.set(factura, []);
  }

  facturaData.get(factura).push({
    fila: i + 1,
    fecha: row[cols.fecha],
    entidad: row[cols.entidad],
    cliente: row[cols.cliente],
    codigo: row[cols.codigo],
    descripcion: row[cols.descripcion],
    cantidad: row[cols.cantidad],
    precio: row[cols.precio],
    usd: row[cols.usd],
    tasaUsd: row[cols.tasaUsd],
    euro: row[cols.euro],
    cupTransf: row[cols.cupTransf],
    cupEfec: row[cols.cupEfec],
    importeCup: row[cols.importeCup],
  });
}

// Buscar facturas con:
// 1. Múltiples líneas (múltiples productos)
// 2. Al menos 2 formas de pago diferentes (USD + CUP, o CUP Transf + CUP Efec, etc.)

console.log('=== BUSCANDO FACTURAS CON MÚLTIPLES PRODUCTOS Y FORMAS DE PAGO ===\n');

let found = 0;
for (const [factura, lines] of facturaData) {
  if (lines.length < 2) continue;

  // Verificar si tiene múltiples formas de pago
  const hasUsd = lines.some(l => l.usd && l.usd > 0);
  const hasEuro = lines.some(l => l.euro && l.euro > 0);
  const hasCupTransf = lines.some(l => l.cupTransf && l.cupTransf > 0);
  const hasCupEfec = lines.some(l => l.cupEfec && l.cupEfec > 0);

  const paymentMethods = [hasUsd, hasEuro, hasCupTransf, hasCupEfec].filter(Boolean).length;

  if (paymentMethods >= 2 && found < 2) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`FACTURA: ${factura} | ${lines.length} productos | ${paymentMethods} formas de pago`);
    console.log(`Cliente: ${lines[0].cliente} | Entidad: ${lines[0].entidad} | Fecha: ${lines[0].fecha}`);
    console.log('='.repeat(70));

    console.log('\nDETALLE POR LÍNEA:');
    console.log('-'.repeat(70));

    let totalCantidad = 0;
    let totalUsd = 0;
    let totalEuro = 0;
    let totalCupTransf = 0;
    let totalCupEfec = 0;
    let totalImporteCup = 0;

    lines.forEach((l, idx) => {
      console.log(`\nLínea ${idx + 1} (Fila Excel ${l.fila}):`);
      console.log(`  Producto: [${l.codigo}] ${l.descripcion}`);
      console.log(`  Cantidad: ${l.cantidad} | Precio: ${l.precio}`);
      console.log(`  Pagos:`);
      if (l.usd) console.log(`    USD: $${l.usd} (Tasa: ${l.tasaUsd})`);
      if (l.euro) console.log(`    EURO: €${l.euro}`);
      if (l.cupTransf) console.log(`    CUP Transferencia: ${l.cupTransf}`);
      if (l.cupEfec) console.log(`    CUP Efectivo: ${l.cupEfec}`);
      console.log(`    Importe CUP: ${l.importeCup}`);

      totalCantidad += l.cantidad || 0;
      totalUsd += l.usd || 0;
      totalEuro += l.euro || 0;
      totalCupTransf += l.cupTransf || 0;
      totalCupEfec += l.cupEfec || 0;
      totalImporteCup += l.importeCup || 0;
    });

    console.log('\n' + '-'.repeat(70));
    console.log('TOTALES SI SUMO TODAS LAS LÍNEAS:');
    console.log(`  Total USD: $${totalUsd}`);
    console.log(`  Total EURO: €${totalEuro}`);
    console.log(`  Total CUP Transferencia: ${totalCupTransf}`);
    console.log(`  Total CUP Efectivo: ${totalCupEfec}`);
    console.log(`  Total Importe CUP: ${totalImporteCup}`);

    // Verificar si los valores de pago son iguales en todas las líneas
    const usdValues = lines.map(l => l.usd).filter(v => v != null);
    const cupTransfValues = lines.map(l => l.cupTransf).filter(v => v != null);
    const cupEfecValues = lines.map(l => l.cupEfec).filter(v => v != null);

    console.log('\nANÁLISIS DE REPETICIÓN:');
    if (usdValues.length > 0) {
      const allSame = usdValues.every(v => v === usdValues[0]);
      console.log(`  USD valores: [${usdValues.join(', ')}] - ${allSame ? '✓ TODOS IGUALES' : '✗ DIFERENTES'}`);
    }
    if (cupTransfValues.length > 0) {
      const allSame = cupTransfValues.every(v => v === cupTransfValues[0]);
      console.log(`  CUP Transf valores: [${cupTransfValues.join(', ')}] - ${allSame ? '✓ TODOS IGUALES' : '✗ DIFERENTES'}`);
    }
    if (cupEfecValues.length > 0) {
      const allSame = cupEfecValues.every(v => v === cupEfecValues[0]);
      console.log(`  CUP Efec valores: [${cupEfecValues.join(', ')}] - ${allSame ? '✓ TODOS IGUALES' : '✗ DIFERENTES'}`);
    }

    found++;
  }
}

// Si no encontramos con 2+ formas de pago, buscar con 1 forma de pago
if (found < 2) {
  console.log('\n\n=== FACTURAS CON MÚLTIPLES PRODUCTOS (1 FORMA DE PAGO) ===\n');

  for (const [factura, lines] of facturaData) {
    if (lines.length >= 3 && found < 4) {
      const hasCupEfec = lines.some(l => l.cupEfec && l.cupEfec > 0);
      const hasCupTransf = lines.some(l => l.cupTransf && l.cupTransf > 0);

      if ((hasCupEfec || hasCupTransf) && found < 4) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`FACTURA: ${factura} | ${lines.length} productos`);
        console.log(`Cliente: ${lines[0].cliente} | Fecha: ${lines[0].fecha}`);
        console.log('='.repeat(70));

        lines.slice(0, 5).forEach((l, idx) => {
          console.log(`  Línea ${idx + 1}: [${l.codigo}] Cant: ${l.cantidad} × Precio: ${l.precio} = CUP Efec: ${l.cupEfec || 0} | Importe: ${l.importeCup}`);
        });

        if (lines.length > 5) console.log(`  ... y ${lines.length - 5} líneas más`);

        const totalImporte = lines.reduce((sum, l) => sum + (l.importeCup || 0), 0);
        const maxImporte = Math.max(...lines.map(l => l.importeCup || 0));

        console.log(`\n  SUMA de Importe CUP: ${totalImporte}`);
        console.log(`  MAX de Importe CUP: ${maxImporte}`);
        console.log(`  DIFERENCIA: ${totalImporte - maxImporte} (esto se pierde con Math.max)`);

        found++;
      }
    }
  }
}
