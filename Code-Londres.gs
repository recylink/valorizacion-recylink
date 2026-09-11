/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de CONSTRUCTORA LONDRES
 * ============================================================
 * Proyecto de Apps Script vinculado al Sheet de Constructora Londres
 * (ID 1uVIfSYPIbCvhaAJLe7Vjrw0drculbkcfhg67ONHhkes).
 *
 * Sheet armado desde la misma plantilla nueva que Vital/Ando (2026-09-11):
 * "📊 Trazabilidad_Docs", "♻️ Valorización" y "🎯 Objetivos" ya traen columna
 * Año (empresa_id, Sucursal, Mes/Tipo, Año, ...), y "Total Residuos" trae
 * Año en la columna B (Sucursal, Año, Mes, Residuo, Valorizado/No
 * Valorizado, Respel no respel, Total KG, Total M3, Tons. CO2eq.
 * evitadas) — mismo esquema que Euro/Gespania/Salfa/Vital, así que todo el
 * borrado selectivo de este archivo compara SIEMPRE incluyendo el Año
 * (mismo fix aplicado a esas empresas el 2026-08-31, para no arrastrar el
 * bug original de borrar por empresa_id+Tipo/Mes solo, sin Año).
 *
 * Este archivo solo cubre lo que usa valorizacion-recylink.html (doGet/
 * doPost "clásico") — Constructora Londres se integró a la app principal,
 * sin visor standalone propio. No incluye soporte de "% de avance"
 * (FGR/CO2ev·m², exclusivo de Euro) ni de Minuta/Seguimiento_CSE (esas
 * pestañas existen en el Sheet por venir de la plantilla base, pero hoy
 * no las consume ningún visor de Londres — se pueden agregar después si
 * se construye un visor standalone, siguiendo el patrón de Code-Euro.gs).
 * ============================================================
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startRow = 6;

  function readSheet(nombre) {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet || sheet.getLastRow() < startRow) return [];
    const headers = sheet.getRange(5, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();
    return data.filter(r => r[0] !== '').map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
  }

  const result = {
    valorizacion: readSheet('♻️ Valorización') || readSheet('Valorización'),
    trazabilidad: readSheet('📊 Trazabilidad_Docs') || readSheet('Trazabilidad_Docs'),
    objetivos: readSheet('🎯 Objetivos') || readSheet('Objetivos'),
    respel: readRespelSheet_(),
    totalResiduos: readTotalResiduosSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tipo = data.tipo;

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'valorizacion_metas') writeMetas(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Borra por empresa_id+Tipo+Año exacto (no solo empresa_id+Tipo): si el
// cliente no manda la fila "Meta %" (porque todavía no conoce el valor
// real), esta no debe borrarse, y sincronizar el año en curso no debe
// arrastrar años anteriores con el mismo Tipo.
function writeValorizacion(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[3]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2] + '|' + r[3])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// Actualiza in-place la fila "Meta %" por empresa_id+Tipo+Año exacto (una
// meta por sucursal por año).
function writeMetas(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  data.filas.forEach(function(fila) {
    const id = fila[0];
    const anio = fila[3];
    let found = false;
    rows.forEach(function(row, i) {
      if (row[0] === id && row[2] === 'Meta %' && String(row[3]) === String(anio)) {
        sheet.getRange(startRow + i, 1, 1, fila.length).setValues([fila]);
        found = true;
      }
    });
    if (!found) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, fila.length).setValues([fila]);
    }
  });
}

// Borra por empresa_id+Mes+Año exacto (no solo empresa_id+Mes): todos los
// residuos de ese mes+año se borran/reinsertan juntos (autoSync() siempre
// manda el set completo de residuos de un mes a la vez), sin arrastrar
// otros años.
function writeTrazabilidad(ss, data) {
  const sheet = ss.getSheetByName('📊 Trazabilidad_Docs') || ss.getSheetByName('Trazabilidad_Docs');
  if (!sheet) throw new Error('Hoja Trazabilidad_Docs no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[3]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2] + '|' + r[3])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// Borra por empresa_id+Mes+Año+Objetivo exacto (columna Año en índice 3,
// Objetivo en índice 4) para no perder histórico de otras
// sucursales/meses/años/objetivos al sincronizar.
function writeObjetivos(ss, data) {
  const sheet = ss.getSheetByName('🎯 Objetivos') || ss.getSheetByName('Objetivos');
  if (!sheet) throw new Error('Hoja Objetivos no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[3] + '|' + f[4]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2] + '|' + r[3] + '|' + r[4])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// ── Total Residuos + RESPEL ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal" o "Residuo") y devuelve el número de fila (1-indexed).
// Evita asumir que el header está en una fila fija, ya que estas 2 hojas
// no tienen las filas decorativas de título/instrucciones que sí tienen
// las 3 hojas principales.
function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

// Reemplaza SOLO las filas de "Total Residuos" cuya Sucursal+Año+Mes
// coincide con lo que trae el Excel recién cargado (borrado selectivo por
// "identidad" del grupo, no de la hoja entera) — el resto de obras/meses
// no tocados por esta carga queda intacto.
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();

  if (data.filas && data.filas.length > 0) {
    // Clave = Sucursal|Año|Mes (columnas A|B|C). No se incluye Residuo en
    // la clave a propósito: si el Excel nuevo trae un desglose distinto de
    // residuos para esa misma Sucursal+Año+Mes, TODAS las filas viejas de
    // ese mes se reemplazan por el set nuevo completo.
    var keys = new Set(data.filas.map(function (f) { return String(f[0]) + '|' + String(f[1]) + '|' + String(f[2]); }));
    if (lastRow >= startRow) {
      var cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
      var toDelete = [];
      cols.forEach(function (r, i) {
        var key = String(r[0]) + '|' + String(r[1]) + '|' + String(r[2]);
        if (keys.has(key)) toDelete.push(startRow + i);
      });
      toDelete.reverse().forEach(function (r) { sheet.deleteRow(r); });
    }
    var insertRow = sheet.getLastRow() + 1;
    sheet.getRange(insertRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// Lee "Total Residuos" completa como array de objetos (Sucursal | Año |
// Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG |
// Total M3 | Tons. CO2eq. evitadas), para que el % Acumulado ponderado por
// kg real (getAcumReal_ en valorizacion-recylink.html) funcione igual que
// para el resto de empresas del grupo Año.
function readTotalResiduosSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Total Residuos');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
  return data.filter(function (r) { return String(r[0] || '').trim() !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
}

// Lee la hoja RESPEL (Residuo -> TRUE/FALSE) como array de objetos, igual
// formato que las otras hojas.
function readRespelSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RESPEL');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Residuo');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var headers = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  return data.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
}
