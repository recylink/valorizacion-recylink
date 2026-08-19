/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de EURO
 * ============================================================
 * Proyecto de Apps Script nuevo, para vincular al Sheet de Euro
 * (ID 1au2aa9n0Sh6kYS5TEq28g1nmS_4O9tZFDNaf3j7CQoY). No existía Apps
 * Script previo para esta empresa.
 *
 * Mismo esquema que Code-Gespania.gs / Code-Salfa.gs: writeObjetivos
 * borra solo por empresa_id + mes exacto (no por prefijo de empresa
 * completo), soporte para tipo:'totalResiduos', y doGet expone la hoja
 * RESPEL propia del Sheet (Residuo -> TRUE/FALSE).
 *
 * Requiere que el Sheet tenga las pestañas "Total Residuos" (headers:
 * Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no
 * respel | Total KG | Total M3) y "RESPEL" (headers: Residuo | RESPEL)
 * ya creadas — Euro ya las trae, solo confirmar que los headers
 * coincidan exactamente antes de desplegar.
 * ============================================================
 */

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
    else if (tipo === 'avance') writeAvance(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeValorizacion(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    // Borrar por empresa_id+Tipo (no solo empresa_id): si el cliente no manda
    // la fila "Meta %" (porque todavía no conoce el valor real), esta no debe
    // borrarse — antes se borraban las 3 filas (% Real/% Acumulado/Meta %) por
    // cualquier coincidencia de empresa_id, perdiendo la meta ya guardada.
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

function writeMetas(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return;
  const rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  data.filas.forEach(function(fila) {
    const id = fila[0];
    let found = false;
    rows.forEach(function(row, i) {
      if (row[0] === id && row[2] === 'Meta %') {
        sheet.getRange(startRow + i, 1, 1, fila.length).setValues([fila]);
        found = true;
      }
    });
    if (!found) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, fila.length).setValues([fila]);
    }
  });
}

function writeTrazabilidad(ss, data) {
  const sheet = ss.getSheetByName('📊 Trazabilidad_Docs') || ss.getSheetByName('Trazabilidad_Docs');
  if (!sheet) throw new Error('Hoja Trazabilidad_Docs no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 3).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// Borra solo las filas cuyo empresa_id+mes coincide exactamente con lo que
// se esta reinsertando (no por prefijo de empresa completo), para no perder
// historico de objetivos de otras sucursales/meses al sincronizar.
// FIX (2026-08-14): antes borraba por empresa_id+mes, lo que hacia que
// sincronizar un objetivo calculado (trazabilidad, valorizar_especificos)
// borrara de paso las filas de objetivos "manual" (FGR, CO2, proveedores,
// acompanamiento, costo) de la MISMA sucursal+mes, aunque el sync nunca
// vuelve a mandarlas (calcObjetivos() nunca calcula un estado para tipo
// 'manual', asi que no se reinsertan). Ahora borra por
// empresa_id+mes+Objetivo exacto. OJO: en Euro la columna D es "Año"
// (agregada aparte), asi que el texto del Objetivo queda en la columna E
// (indice 4), no en la 3 como en las demas empresas.
function writeObjetivos(ss, data) {
  const sheet = ss.getSheetByName('🎯 Objetivos') || ss.getSheetByName('Objetivos');
  if (!sheet) throw new Error('Hoja Objetivos no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[4]));
    const toDelete = [];
    cols.forEach((r, i) => { if (keys.has(r[0] + '|' + r[2] + '|' + r[4])) toDelete.push(startRow + i); });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// ── Total Residuos + RESPEL ──

// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal" o "Residuo") y devuelve el numero de fila (1-indexed).
// Evita asumir que el header esta en una fila fija, ya que estas 2 hojas
// no tienen las filas decorativas de titulo/instrucciones que si tienen
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

// Reemplaza TODAS las filas de datos de "Total Residuos" por las que manda
// el cliente. El cliente siempre envia el set completo vigente (calculado
// desde el Excel cargado), asi que no hace falta borrado selectivo por
// empresa_id como en writeValorizacion (esta hoja no tiene esa columna).
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var numCols = 9; // Sucursal | Año | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, numCols).clearContent();
  }
  if (data.filas && data.filas.length > 0) {
    sheet.getRange(startRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
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

// ── "% de avance" (FGR y Ton CO2 evitadas/m2, agregado 2026-08-19) ──
// Formato particular, distinto a las hojas estandar: fila 1 = "Sucursal" +
// nombre de cada obra por columna, fila 2 = "m2 totales" + el m2 de cada
// obra alineado con la fila 1, fila 3 vacia, fila 4 = headers
// (empresa_id|Sucursal|Tipo|Año|MESES...), fila 5+ = datos (3 filas por
// obra: "% Avance" ingresado a mano, "FGR" y "CO2ev/m2" calculados por el
// visor).
function readAvanceSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('%avance') || ss.getSheetByName('% de avance');
  if (!sheet) return { m2Totales: {}, filas: [] };

  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();

  var m2Totales = {};
  if (lastRow >= 2 && lastCol >= 2) {
    var fila1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var fila2 = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    for (var c = 1; c < lastCol; c++) {
      var suc = String(fila1[c] || '').trim();
      if (!suc) continue;
      var raw = fila2[c];
      var m2 = typeof raw === 'number' ? raw : parseFloat(String(raw || '').replace(/\./g, '').replace(',', '.'));
      if (!isNaN(m2)) m2Totales[suc] = m2;
    }
  }

  var headerRow = 4, startRow = 5;
  var filas = [];
  if (lastRow >= startRow) {
    var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
    data.forEach(function (r) {
      if (String(r[1] || '').trim() === '') return;
      var obj = {};
      headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
      filas.push(obj);
    });
  }

  return { m2Totales: m2Totales, filas: filas };
}

// Actualiza in-place las filas "FGR"/"CO2ev/m2" de "% de avance" (calculadas
// por el visor), escribiendo cada mes por NOMBRE de columna (no por
// posicion) para no depender de que el cliente conozca el rango exacto de
// meses del header — la hoja puede empezar en cualquier mes, no
// necesariamente Enero. Nunca toca las filas "% Avance" (ingreso manual):
// el cliente solo envia filas con Tipo 'FGR' o 'CO2ev/m2'.
function writeAvance(ss, data) {
  var sheet = ss.getSheetByName('%avance') || ss.getSheetByName('% de avance');
  if (!sheet) throw new Error('Hoja "% de avance" no encontrada');
  var startRow = 5, headerRow = 4;
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var colByMes = {};
  headers.forEach(function (h, i) { if (h) colByMes[String(h).trim().toUpperCase()] = i + 1; });

  var lastRow = sheet.getLastRow();
  var existentes = lastRow >= startRow
    ? sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues()
    : [];

  (data.filas || []).forEach(function (fila) {
    var suc = fila.Sucursal, tipo = fila.Tipo, anio = String(fila['Año'] || '');
    var targetRow = null;
    for (var i = 0; i < existentes.length; i++) {
      var r = existentes[i];
      if (String(r[1]).trim() === suc && String(r[2]).trim() === tipo && String(r[3]) === anio) {
        targetRow = startRow + i;
        break;
      }
    }
    if (!targetRow) {
      targetRow = sheet.getLastRow() + 1;
      sheet.getRange(targetRow, 1, 1, 4).setValues([[fila.empresa_id || '', suc, tipo, anio]]);
    } else if (fila.empresa_id) {
      sheet.getRange(targetRow, 1).setValue(fila.empresa_id);
    }
    Object.keys(fila.valores || {}).forEach(function (mesNombre) {
      var col = colByMes[mesNombre.toUpperCase()];
      if (!col) return;
      sheet.getRange(targetRow, col).setValue(fila.valores[mesNombre]);
    });
  });
}

// ── "👥 Seguimiento_CSE" (Acompañamiento en terreno, agregado 2026-08-19) ──
// Header en la fila donde columna A dice literalmente "empresa_id" (se
// busca dinamicamente, no se asume fila fija — el usuario indicó fila 3,
// pero por consistencia con el resto de hojas custom de este archivo se
// ubica igual que Total Residuos/RESPEL). Una fila por Sucursal+Acción CSE
// (Correo seguimiento / Reunión seguimiento / Visita a terreno), con
// SI/NO por mes. Sin columna Año — el cliente asume el año actual, mismo
// criterio que ya usa el resto del sistema para hojas sin esa columna.
function readCseSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('👥 Seguimiento_CSE') || ss.getSheetByName('Seguimiento_CSE');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'empresa_id');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues();
  return data.filter(function (r) { return String(r[1] || '').trim() !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i]; });
    return obj;
  });
}

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
    avance: readAvanceSheet_(),
    cse: readCseSheet_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
