const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ANÁLISIS DE INVENTARIO.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Ventas'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

// Encontrar encabezados
const headerRow = data[0];
console.log('=== ENCABEZADOS DE VENTAS ===\n');
headerRow.forEach((h, i) => {
  if (h) console.log(`Col ${i}: ${String(h).replace(/\n/g, ' ')}`);
});

// Encontrar columnas clave
const colFactura = headerRow.findIndex(h => h && String(h).toLowerCase().includes('factura'));
const colFecha = headerRow.findIndex(h => h && String(h).toLowerCase().includes('fecha'));
const colCodigo = headerRow.findIndex(h => h && String(h).toLowerCase().includes('codigo'));
const colProducto = headerRow.findIndex(h => h && String(h).toLowerCase().includes('producto'));
const colCantidad = headerRow.findIndex(h => h && String(h).toLowerCase().includes('cantidad'));
const colPrecio = headerRow.findIndex(h => h && String(h).toLowerCase() === 'precio');
const colUSD = headerRow.findIndex(h => h && String(h).toLowerCase() === 'usd');
const colCUPTransf = headerRow.findIndex(h => h && String(h).toLowerCase().includes('cup transferencia'));
const colCUPEfec = headerRow.findIndex(h => h && String(h).toLowerCase().includes('cup efectivo'));
const colImporteCUP = headerRow.findIndex(h => h && String(h).toLowerCase().includes('importe cup'));

console.log('\n=== COLUMNAS DETECTADAS ===');
console.log(`Factura: ${colFactura}, Fecha: ${colFecha}, Codigo: ${colCodigo}`);
console.log(`Precio: ${colPrecio}, USD: ${colUSD}, CUP Transf: ${colCUPTransf}, CUP Efec: ${colCUPEfec}, Importe CUP: ${colImporteCUP}`);

// Buscar facturas con múltiples líneas
const facturaLines = new Map();
for (let i = 1; i < Math.min(data.length, 5000); i++) {
  const row = data[i];
  if (!row) continue;
  const factura = row[colFactura];
  if (!factura || factura === '-') continue;

  if (!facturaLines.has(factura)) {
    facturaLines.set(factura, []);
  }
  facturaLines.get(factura).push({
    fila: i + 1,
    fecha: row[colFecha],
    codigo: row[colCodigo],
    producto: row[colProducto],
    cantidad: row[colCantidad],
    precio: row[colPrecio],
    usd: row[colUSD],
    cupTransf: row[colCUPTransf],
    cupEfec: row[colCUPEfec],
    importeCup: row[colImporteCUP],
  });
}

// Mostrar facturas con más de 1 línea
console.log('\n=== EJEMPLOS DE FACTURAS CON MÚLTIPLES LÍNEAS ===\n');

let count = 0;
for (const [factura, lines] of facturaLines) {
  if (lines.length > 1 && count < 3) {
    console.log(`\n--- FACTURA: ${factura} (${lines.length} líneas) ---`);
    lines.forEach(l => {
      console.log(`  Fila ${l.fila}: Cod ${l.codigo} | Cant: ${l.cantidad} | Precio: ${l.precio} | USD: ${l.usd} | CUP Transf: ${l.cupTransf} | CUP Efec: ${l.cupEfec} | Importe CUP: ${l.importeCup}`);
    });

    // Verificar si los pagos son iguales o diferentes
    const usdValues = lines.map(l => l.usd).filter(v => v != null && v !== 0);
    const cupValues = lines.map(l => l.importeCup).filter(v => v != null && v !== 0);

    if (usdValues.length > 0) {
      const allSameUsd = usdValues.every(v => v === usdValues[0]);
      console.log(`  >> USD: ${usdValues.join(', ')} - ${allSameUsd ? 'MISMO VALOR' : 'VALORES DIFERENTES'}`);
    }
    if (cupValues.length > 0) {
      const allSameCup = cupValues.every(v => v === cupValues[0]);
      console.log(`  >> CUP: ${cupValues.join(', ')} - ${allSameCup ? 'MISMO VALOR' : 'VALORES DIFERENTES'}`);
    }

    count++;
  }
}

// Mostrar también una factura de una sola línea con pago
console.log('\n=== EJEMPLO DE FACTURA CON 1 LÍNEA ===\n');
for (const [factura, lines] of facturaLines) {
  if (lines.length === 1 && (lines[0].usd || lines[0].importeCup)) {
    console.log(`FACTURA: ${factura}`);
    const l = lines[0];
    console.log(`  Fila ${l.fila}: Cod ${l.codigo} | Cant: ${l.cantidad} | Precio: ${l.precio} | USD: ${l.usd} | CUP Transf: ${l.cupTransf} | Importe CUP: ${l.importeCup}`);
    break;
  }
}
