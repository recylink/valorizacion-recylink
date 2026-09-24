/**
 * ============================================================
 * RECYLINK · Apps Script dedicado a config interna del panel
 * ============================================================
 * Proyecto NUEVO Y SEPARADO de los de cada cliente (Copec/Euro/
 * Socovesa/etc.) — este Sheet no pertenece a ningún cliente, solo
 * guarda preferencias internas del panel valorizacion-recylink.html.
 *
 * Agregado 2026-09-23, a pedido del usuario: "Empresas Cerradas" vivía
 * en localStorage del navegador (rápido, sin redeploy, pero se pierde
 * en incógnito o al cambiar de navegador/computador) — se mueve a un
 * Sheet dedicado para que sea la misma lista sin importar desde dónde
 * se abra el panel.
 *
 * Requiere una pestaña "Empresas Cerradas" con el header "Empresa" en
 * A1 (una fila por empresa cerrada, guardando el id tal cual aparece
 * en el objeto EMPRESAS de valorizacion-recylink.html, ej. "salfa").
 *
 * AGREGADO 2026-09-24, a pedido del usuario: "quisiera añadir los CSE
 * (Customer Success Executive) de cada empresa y después saber cuántas
 * empresas y sucursales tiene dicho CSE" — requiere una segunda pestaña
 * "CSE" con headers "Empresa" (A1) y "CSE" (B1). Una fila por empresa que
 * ya tiene un CSE asignado (empresa_id | nombre del CSE) — a diferencia de
 * "Empresas Cerradas" (lista sparse de las cerradas), acá se guarda una
 * fila por CADA empresa con CSE asignado, sin importar si está cerrada.
 * ============================================================
 */

function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0] || '').trim() === valorEsperado) return i + 1;
  }
  return null;
}

function readEmpresasCerradasSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Empresas Cerradas');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Empresa');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 1).getValues();
  return data.map(function (r) { return String(r[0] || '').trim(); }).filter(function (s) { return s !== ''; });
}

// Reemplaza la lista completa cada vez (el cliente siempre manda el set
// vigente completo) — mismo criterio que "⚙️ Obras Cerradas"/"⚙️
// Sucursales Cerradas" ya usadas en Code-Euro.gs/Code-Socovesa.gs.
function writeEmpresasCerradas_(ss, data) {
  var sheet = ss.getSheetByName('Empresas Cerradas');
  if (!sheet) throw new Error('Hoja "Empresas Cerradas" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Empresa');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Empresa") en Empresas Cerradas');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, 1).clearContent();
  }
  var empresas = data.empresas || [];
  if (empresas.length > 0) {
    sheet.getRange(startRow, 1, empresas.length, 1).setValues(empresas.map(function (e) { return [e]; }));
  }
}

// Lee "CSE" (Empresa | CSE) — una fila por empresa con CSE asignado.
function readCseAsignadoSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CSE');
  if (!sheet) return [];
  var headerRow = buscarFilaEncabezado_(sheet, 'Empresa');
  if (!headerRow) return [];
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return [];
  var data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 2).getValues();
  return data
    .map(function (r) { return { Empresa: String(r[0] || '').trim(), CSE: String(r[1] || '').trim() }; })
    .filter(function (r) { return r.Empresa !== ''; });
}

// Reemplaza la lista completa cada vez (el cliente siempre manda el set
// vigente completo — una fila por cada empresa que tiene un CSE asignado;
// una empresa sin CSE simplemente no aparece).
function writeCseAsignado_(ss, data) {
  var sheet = ss.getSheetByName('CSE');
  if (!sheet) throw new Error('Hoja "CSE" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Empresa');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Empresa") en CSE');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, 2).clearContent();
  }
  var asignaciones = data.asignaciones || []; // [[empresaId, cseNombre], ...]
  if (asignaciones.length > 0) {
    sheet.getRange(startRow, 1, asignaciones.length, 2).setValues(asignaciones);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      empresasCerradas: readEmpresasCerradasSheet_(),
      cseAsignado: readCseAsignadoSheet_()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.tipo === 'empresasCerradas') writeEmpresasCerradas_(ss, data);
    else if (data.tipo === 'cseAsignado') writeCseAsignado_(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
