/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de EURO
 * ============================================================
 * Proyecto de Apps Script vinculado al Sheet de Euro
 * (ID 1au2aa9n0Sh6kYS5TEq28g1nmS_4O9tZFDNaf3j7CQoY).
 *
 * Mismo esquema que Code-Gespania.gs / Code-Salfa.gs: writeObjetivos
 * borra solo por empresa_id + mes exacto (no por prefijo de empresa
 * completo), soporte para tipo:'totalResiduos', y doGet expone la hoja
 * RESPEL propia del Sheet (Residuo -> TRUE/FALSE).
 *
 * Requiere que el Sheet tenga las pestañas "Total Residuos" (headers:
 * Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no
 * respel | Total KG | Total M3) y "RESPEL" (headers: Residuo | RESPEL)
 * ya creadas.
 *
 * AGREGADO 2026-08-19: soporte de la pestaña "Minuta" — lectura vía
 * GET ?minutas=1 y guardado vía POST tipo:'minutas'. Ajusta
 * MINUTA_SHEET_NAME más abajo si tu pestaña tiene otro nombre.
 *
 * AGREGADO 2026-08-26: soporte de "👥 Seguimiento_CSE" editable desde
 * el visor — guardado vía POST tipo:'cse' (writeCSE_). La lectura
 * (readCseSheet_) ya existía.
 *
 * AGREGADO 2026-08-26 (2): doGet ahora también expone "Total Residuos"
 * (readTotalResiduosSheet_) para que el visor recalcule FGR/CO2ev·m² en
 * vivo cuando se edita el % Avance en la pestaña FGR — el % Avance en sí
 * se guarda con el mismo POST tipo:'avance' (writeAvance) que ya existía.
 *
 * FIX 2026-08-26 (3): writeTotalResiduos ya no borra toda la hoja en cada
 * carga — ahora borra solo las filas Sucursal+Año+Mes que trae el Excel
 * nuevo (mismo criterio que writeValorizacion/writeTrazabilidad/
 * writeObjetivos), porque el Excel de Euro normalmente trae un solo mes
 * y antes eso borraba el histórico completo de "Total Residuos".
 *
 * AGREGADO 2026-08-26 (4): soporte de POST tipo:'m2totales' (writeM2Totales_)
 * para editar el m² total de cada obra desde el panel "M² Obras" del
 * visor — actualiza la fila 2 ("m2 totales") de "% de avance", misma
 * pestaña de donde readAvanceSheet_ ya la exponía por GET.
 * ============================================================
 */

var MINUTA_SHEET_NAME = 'Minuta'; // ← cambia esto si tu pestaña tiene otro nombre

function doGet(e) {
  // ── Minutas: se atiende aparte y se corta acá, antes de armar el
  // resto del payload estándar (valorizacion/trazabilidad/objetivos/...).
  if (e.parameter && e.parameter.minutas) {
    return ContentService
      .createTextOutput(JSON.stringify({ rows: readMinutaRows_() }))
      .setMimeType(ContentService.MimeType.JSON);
  }

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
    cse: readCseSheet_(),
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
    let extra = {};

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'valorizacion_metas') writeMetas(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data);
    else if (tipo === 'avance') writeAvance(ss, data);
    else if (tipo === 'minutas') writeMinutaSessions_(data.sessions);
    else if (tipo === 'cse') writeCSE_(ss, data);
    else if (tipo === 'm2totales') extra = { noEncontradas: writeM2Totales_(ss, data) };

    return ContentService
      .createTextOutput(JSON.stringify(Object.assign({ok: true}, extra)))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// FIX (2026-08-31): la hoja tiene columna Año (índice 3), pero el borrado
// comparaba solo por empresa_id+Tipo — sincronizar "% Real" de un año
// borraba de paso "% Real"/"% Acumulado"/"Meta %" de TODOS los años
// anteriores con el mismo Tipo (mismo bug ya encontrado y corregido en
// Code-Gespania.gs y Code-Socovesa.gs). Se agrega el Año a la clave.
function writeValorizacion(ss, data) {
  const sheet = ss.getSheetByName('♻️ Valorización') || ss.getSheetByName('Valorización');
  if (!sheet) throw new Error('Hoja Valorización no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    // Borrar por empresa_id+Tipo+Año (no solo empresa_id): si el cliente no manda
    // la fila "Meta %" (porque todavía no conoce el valor real), esta no debe
    // borrarse — antes se borraban las 3 filas (% Real/% Acumulado/Meta %) por
    // cualquier coincidencia de empresa_id, perdiendo la meta ya guardada.
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

// FIX (2026-08-31): syncMetas() manda una fila "Meta %" POR AÑO para esta
// empresa (ver EMPRESAS_VAL_CON_ANIO en el cliente), pero esto matcheaba
// solo por empresa_id+Tipo (sin Año) — al procesar la 2da fila (ej. 2026)
// se sobreescribia la fila de OTRO año (ej. 2025) que ya habia matcheado
// con la 1ra fila, perdiendo esa meta. Se agrega el Año a la comparacion
// (mismo bug ya encontrado y corregido en Code-Gespania.gs).
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

// FIX (2026-08-31): la hoja tiene columna Año en D (Sucursal, Mes, Año,
// Residuo, ...) pero el borrado comparaba solo por empresa_id+Mes —
// sincronizar cualquier mes borraba de paso las filas de ESE MISMO mes de
// TODOS los años anteriores (mismo bug ya encontrado y corregido en
// Code-Gespania.gs y Code-Socovesa.gs). Se agrega el Año a la clave.
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
//
// FIX 2 (2026-08-31): esa clave (empresa_id+mes+Objetivo) dejo de incluir
// el Año — mismo texto de objetivo en el mismo mes pero de OTRO año se
// borraba igual al resincronizar (mismo bug ya encontrado y corregido en
// Code-Gespania.gs / Code-Socovesa.gs). Se agrega el Año de vuelta a la
// clave, ahora junto con el Objetivo (empresa_id+mes+año+Objetivo), para
// no repetir el bug original del FIX de 2026-08-14 (año solo, sin Objetivo).
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

// Reemplaza SOLO las filas de "Total Residuos" cuya Sucursal+Año+Mes
// coincide con lo que trae el Excel recién cargado — igual criterio que
// writeValorizacion/writeTrazabilidad/writeObjetivos (borrado selectivo
// por "identidad" del grupo, no de la hoja entera). El resto de
// obras/meses no tocados por esta carga queda intacto.
// FIX (2026-08-26): antes hacía sheet.getRange(...).clearContent() sobre
// TODA la hoja de datos, así que un Excel de un solo mes (el caso normal
// para Euro) borraba el histórico completo de meses anteriores — grave
// porque el visor usa esta hoja para el FGR/CO2ev·m² acumulado en vivo.
function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();

  if (data.filas && data.filas.length > 0) {
    // Clave = Sucursal|Año|Mes (columnas A|B|C). No se incluye Residuo en
    // la clave a propósito: si el Excel nuevo trae un desglose distinto
    // de residuos para esa misma Sucursal+Año+Mes (uno menos, uno nuevo),
    // TODAS las filas viejas de ese mes se reemplazan por el set nuevo
    // completo, en vez de dejar filas de residuos obsoletas mezcladas.
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
// Total M3 | Tons. CO2eq. evitadas), agregado 2026-08-26 para que el
// visor pueda recalcular FGR/CO2ev·m² en vivo a partir del % Avance que
// se edita ahí (necesita los m³ y las Ton CO2 evitadas por Sucursal+Mes,
// que hasta ahora solo vivían en esta hoja sin exponerse por GET).
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

// Actualiza la fila 2 ("m2 totales") de "% de avance" para las obras que
// vengan en data.valores ({Sucursal: m2}), agregado 2026-08-26 para que
// el visor pueda editar el m² total de cada obra desde el panel "M²
// Obras" (usado por FGR/CO2ev·m²). Solo actualiza columnas que YA existen
// (Sucursal presente en la fila 1) — no crea columnas nuevas para una
// obra sin columna todavía; esas se devuelven en el array de retorno para
// que el visor avise en vez de fallar en silencio.
function writeM2Totales_(ss, data) {
  var sheet = ss.getSheetByName('%avance') || ss.getSheetByName('% de avance');
  if (!sheet) throw new Error('Hoja "% de avance" no encontrada');
  var lastCol = sheet.getLastColumn();
  var colBySuc = {};
  if (lastCol >= 2) {
    var fila1 = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var c = 1; c < lastCol; c++) {
      var suc = String(fila1[c] || '').trim();
      if (suc) colBySuc[suc] = c + 1;
    }
  }
  var noEncontradas = [];
  Object.keys(data.valores || {}).forEach(function (suc) {
    var col = colBySuc[suc];
    if (!col) { noEncontradas.push(suc); return; }
    sheet.getRange(2, col).setValue(data.valores[suc]);
  });
  return noEncontradas;
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

// Guarda in-place (por empresa_id + Acción, igual criterio que writeAvance
// con Sucursal+Tipo+Año) los valores SI/NO/N/A por mes que edita el visor
// desde el Seguimiento CSE clickeable; si la fila empresa_id+Acción no
// existe todavía la crea. OJO: si el header real de la columna de acción
// en el Sheet no es exactamente "Acción" (con tilde), ajustar colAccion.
function writeCSE_(ss, data) {
  var sheet = ss.getSheetByName('👥 Seguimiento_CSE') || ss.getSheetByName('Seguimiento_CSE');
  if (!sheet) throw new Error('Hoja "Seguimiento_CSE" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'empresa_id');
  if (!headerRow) throw new Error('No se encontró la fila de encabezado ("empresa_id") en Seguimiento_CSE');
  var startRow = headerRow + 1;
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

  var idx = {};
  headers.forEach(function (h, i) { if (h) idx[String(h).trim()] = i + 1; });
  var colEmpresa = idx['empresa_id'];
  var colAccion = idx['Acción'] || idx['Accion'];
  var colSucursal = idx['Sucursal'];
  if (!colEmpresa || !colAccion) throw new Error('Encabezados "empresa_id"/"Acción" no encontrados en Seguimiento_CSE');

  var colByMes = {};
  headers.forEach(function (h, i) {
    var norm = String(h || '').trim();
    var col = i + 1;
    if (norm && col !== colEmpresa && col !== colAccion && col !== colSucursal) colByMes[norm.toUpperCase()] = col;
  });

  var lastRow = sheet.getLastRow();
  var existentes = lastRow >= startRow
    ? sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).getValues()
    : [];

  (data.filas || []).forEach(function (fila) {
    var targetRow = null;
    for (var i = 0; i < existentes.length; i++) {
      var r = existentes[i];
      if (String(r[colEmpresa - 1]).trim() === fila.empresaId && String(r[colAccion - 1]).trim() === fila.accion) {
        targetRow = startRow + i;
        break;
      }
    }
    if (!targetRow) {
      targetRow = sheet.getLastRow() + 1;
      sheet.getRange(targetRow, colEmpresa).setValue(fila.empresaId);
      sheet.getRange(targetRow, colAccion).setValue(fila.accion);
      if (colSucursal) sheet.getRange(targetRow, colSucursal).setValue(fila.sucursal);
    }
    Object.keys(fila.valores || {}).forEach(function (mesNombre) {
      var col = colByMes[mesNombre.toUpperCase()];
      if (!col) return;
      sheet.getRange(targetRow, col).setValue(fila.valores[mesNombre]);
    });
  });
}

// ── "Minuta" (agregado 2026-08-19) ──

// Lee la pestaña de Minuta completa como matriz de valores (tal cual está
// en el Sheet), igual formato que espera el front-end (mnRowsToSessions
// del visor: fila-título con solo columna A llena, luego opcionalmente
// una fila "Tema/Revisado/Detalle/Acuerdos/Resuelto", luego filas de
// ítems, hasta la próxima fila-título o el final de la hoja).
function readMinutaRows_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MINUTA_SHEET_NAME);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastCol).getValues();
}

// Reescribe la pestaña de Minuta completa a partir de las "sessions" que
// manda el front-end. Cada session = { title, items: [{item, cumplido,
// comentario, acuerdos, revisado}] }. Se reconstruye con el mismo formato
// de fila-título + fila "Tema|Revisado|Detalle|Acuerdos|Resuelto" + filas
// de datos + fila en blanco separadora, para que el próximo GET lo vuelva
// a parsear igual.
function writeMinutaSessions_(sessions) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(MINUTA_SHEET_NAME);
  if (!sheet) throw new Error('Hoja "' + MINUTA_SHEET_NAME + '" no encontrada');

  var rows = [];
  (sessions || []).forEach(function (sess) {
    rows.push([sess.title || '', '', '', '', '']);
    rows.push(['Tema', 'Revisado', 'Detalle', 'Acuerdos', 'Resuelto']);
    (sess.items || []).forEach(function (it) {
      rows.push([
        it.item || '',
        it.revisado ? true : false,
        it.comentario || '',
        it.acuerdos || '',
        it.cumplido ? true : false
      ]);
    });
    rows.push(['', '', '', '', '']); // fila en blanco separadora
  });

  sheet.clearContents();
  if (rows.length) {
    var numCols = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var padded = rows.map(function (r) {
      while (r.length < numCols) r.push('');
      return r;
    });
    sheet.getRange(1, 1, padded.length, numCols).setValues(padded);
  }
}
