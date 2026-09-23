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

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ empresasCerradas: readEmpresasCerradasSheet_() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (data.tipo === 'empresasCerradas') writeEmpresasCerradas_(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
