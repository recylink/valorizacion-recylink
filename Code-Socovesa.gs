/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de SOCOVESA — VERSIÓN FUSIONADA
 * ============================================================
 * Este archivo reemplaza por completo tu Code.gs actual. Todo lo que ya
 * usa la app de Valorización queda intacto (doPost, y el doGet original de
 * filas crudas), y también el visor legado "de Trazabilidad" que ya
 * consume esta misma URL con ?callback=X (sin ningún otro parámetro).
 *
 * LO QUE SE AGREGA:
 *
 *  1) EL VISOR NUEVO (COPEC/PMS/Abastible/Salfa-style, con pestaña
 *     Objetivos/Mensual/Anual/Valorización por sucursal):
 *     - Se activa SOLO si la request trae ?visor=1 (con o sin callback).
 *     - Como tu visor legado ya usa ?callback=X (sin visor=1) para pedir
 *       datos, este visor nuevo usa ?visor=1&callback=X — así nunca se
 *       pisan entre sí. Tu visor legado sigue funcionando exactamente igual,
 *       incluido el filtro ?suc=.
 *
 *  2) EL VISOR DE MINUTAS (integrado al visor nuevo):
 *     - Se activa SOLO si la request trae ?minutas=1.
 *     - Lee/escribe la pestaña "Minuta" ubicando cada sesión por su fila
 *       real (no por texto de título) y detectando el orden de columnas
 *       leyendo el sub-encabezado ("Tema, Revisado, Detalle, Acuerdos,
 *       Resuelto" en tu caso) — mismo motor que los otros clientes.
 *
 *  FIX (aparte, en tu lógica original): `writeObjetivos` borraba TODAS las
 *  filas de la empresa completa (agrupando por el primer token del
 *  empresa_id, ej. "socovesa"), así que sincronizar un mes borraba el
 *  histórico de objetivos de TODAS las sucursales y meses. Lo cambié para
 *  que borre solo por empresa_id + mes exacto — mismo fix ya aplicado en
 *  Abastible/Salfa/etc.
 *
 *  FIX 2 (este cambio): `construirEmpresas_()` — la función que arma el
 *  arreglo `objetivos` para el visor NUEVO (?visor=1) — nunca leía la hoja
 *  "🎯 Objetivos" ni la pestaña "Objetivos 2026". Generaba solo 2 objetivos
 *  hardcodeados ("100% Trazabilidad" y una tarjeta de Valorización). Ahora
 *  lee ambas hojas y arma, por cada obra, la lista completa de los 7
 *  objetivos definidos en "Objetivos 2026", con el avance/estado real que
 *  traiga la hoja "🎯 Objetivos" para esa obra (o null si aún no hay dato).
 *
 *  FIX 3 (2026-08-27): `writeValorizacion` borraba TODAS las filas de
 *  Valorización de una sucursal (cualquier Tipo, cualquier Año) con solo
 *  coincidir el empresa_id (columna 0) — a diferencia de Objetivos, no
 *  miraba Tipo ni Año. Ahora que el visor manda una fila por Tipo POR AÑO
 *  (columna Año, agregada junto con la de Euro, ahora poblada), esto
 *  significaba que sincronizar el año en curso borraba de paso el
 *  histórico de años anteriores de esa sucursal, porque el sync de ese
 *  momento nunca vuelve a mandar filas de años que no está viendo. Se
 *  corrigió para borrar solo por empresa_id + Tipo + Año exacto (mismo
 *  patrón que ya usa `writeObjetivos` con empresa_id+mes+Objetivo) — así
 *  un sync del año en curso deja intactas las filas de años anteriores.
 *  NOTA: filas viejas que ya tengan la columna Año en blanco (de antes de
 *  este fix) van a quedar huérfanas — no las va a volver a tocar ningún
 *  sync futuro porque su clave (id+Tipo+'') no va a volver a coincidir.
 *  Conviene revisar el Sheet una vez y borrarlas/completarles el Año a
 *  mano si corresponde.
 *
 *  FIX 5 (2026-08-28): mismo problema que el FIX 3, pero en `writeObjetivos`.
 *  La hoja 🎯 Objetivos ya tiene columna Año en D (igual que Euro), así que
 *  el texto del Objetivo pasó del índice 3 al 4 — el borrado seguía
 *  comparando por el índice 3 (ahora Año, no Objetivo), lo que hacía que
 *  sincronizar CUALQUIER objetivo de un mes borrara TODOS los objetivos de
 *  ese mismo mes+año. Se corrigió para leer 5 columnas y comparar por
 *  empresa_id+mes+Objetivo en los índices reales (0, 2, 4) — mismo fix que
 *  ya tiene Code-Euro.gs.
 * ============================================================
 */

// ============================================================
// doPost — SIN CAMBIOS DE LÓGICA (salvo el fix de writeObjetivos + minutas)
// ============================================================
function doPost(e) {
  try {
    // Soporta tanto el POST directo (fetch, JSON en el body) como el método
    // de respaldo del visor de Minutas (formulario oculto, llega como
    // e.parameter.payload). Si no viene ninguno de los dos, se comporta
    // exactamente como antes.
    var raw;
    if (e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    } else {
      raw = e.postData.contents;
    }

    const data = JSON.parse(raw);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tipo = data.tipo;

    if (tipo === 'valorizacion') writeValorizacion(ss, data);
    else if (tipo === 'trazabilidad') writeTrazabilidad(ss, data);
    else if (tipo === 'objetivos') writeObjetivos(ss, data);
    else if (tipo === 'totalResiduos') writeTotalResiduos(ss, data); // NUEVO 2026-08-28 — hoja "Total Residuos"
    else if (tipo === 'minutas') writeMinutas_(ss, data); // NUEVO — Visor de Minutas

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// FIX 3 (2026-08-27): antes borraba TODAS las filas de la sucursal con solo
// coincidir empresa_id (columna 0), sin mirar Tipo ni Año. Ahora que hay una
// fila por Tipo POR AÑO (columna Año, índice 3), eso borraba de paso el
// histórico de años anteriores en cada sync del año en curso, porque ese
// sync nunca vuelve a mandar filas de años que no está viendo. Se cambió a
// borrar por empresa_id + Tipo + Año exacto (mismo patrón que ya usa
// writeObjetivos con empresa_id+mes+Objetivo), así un sync del año en curso
// deja intactas las filas de años anteriores.
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

// FIX (2026-08-31): la hoja 📊 Trazabilidad_Docs tiene columna Año en D
// (Sucursal, Mes, Año, Residuo, ...) pero el borrado seguia comparando solo
// por empresa_id+mes (indices 0,2) sin incluir el Año (indice 3) — al
// sincronizar CUALQUIER mes se borraban de paso las filas de ESE MISMO mes
// de TODOS los años anteriores, no solo el año que se estaba resincronizando
// (mismo bug ya encontrado y corregido en Code-Gespania.gs). Se corrigio
// para leer 4 columnas y comparar por empresa_id+mes+año.
function writeTrazabilidad(ss, data) {
  const sheet = ss.getSheetByName('📊 Trazabilidad_Docs') || ss.getSheetByName('Trazabilidad_Docs');
  if (!sheet) throw new Error('Hoja Trazabilidad_Docs no encontrada');
  const startRow = 6;
  const lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    const cols = sheet.getRange(startRow, 1, lastRow - startRow + 1, 4).getValues();
    const keys = new Set(data.filas.map(f => f[0] + '|' + f[2] + '|' + f[3]));
    const toDelete = [];
    cols.forEach((r, i) => {
      if (keys.has(r[0] + '|' + r[2] + '|' + r[3])) toDelete.push(startRow + i);
    });
    toDelete.reverse().forEach(r => sheet.deleteRow(r));
  }
  const insertRow = sheet.getLastRow() + 1;
  data.filas.forEach((fila, i) => {
    sheet.getRange(insertRow + i, 1, 1, fila.length).setValues([fila]);
  });
}

// FIX (2026-08-14): antes borraba por empresa_id+mes, lo que hacia que
// sincronizar un objetivo calculado (trazabilidad, sinader, etc.) borrara de
// paso las filas de objetivos "manual" (ej. FGR) de la MISMA sucursal+mes,
// aunque el sync nunca vuelve a mandarlas (calcObjetivos() nunca calcula un
// estado para tipo 'manual', asi que no se reinsertan). Ahora borra por
// empresa_id+mes+Objetivo exacto, para no arrastrar filas de otros objetivos.
//
// FIX 5 (2026-08-28): la hoja 🎯 Objetivos ya tiene la misma columna Año en D
// que Euro (agregada junto con la de Valorización/Trazabilidad_Docs) — el
// texto del Objetivo pasó de la columna D (índice 3) a la E (índice 4), pero
// este borrado seguía comparando por el índice 3 (ahora Año, no Objetivo).
// Con la clave vieja (empresa_id+mes+Año), sincronizar CUALQUIER objetivo de
// un mes borraba TODOS los objetivos de ese mismo mes+año, no solo el que se
// estaba resincronizando. Se corrigió para leer 5 columnas y comparar por
// empresa_id+mes+Objetivo en los índices reales (0, 2, 4) — mismo fix ya
// aplicado en Code-Euro.gs (ver comentario ahí: "en Euro la columna D es
// Año... el texto del Objetivo queda en la columna E, índice 4").
//
// FIX 6 (2026-08-31): la clave del FIX 5 (empresa_id+mes+Objetivo) dejó de
// incluir el Año — mismo texto de objetivo en el mismo mes pero de OTRO año
// se borraba igual al resincronizar (mismo bug ya encontrado y corregido en
// Code-Gespania.gs). Se agrega el Año de vuelta a la clave, ahora junto con
// el Objetivo (empresa_id+mes+año+Objetivo), para no repetir el bug original
// del FIX 5 (año solo, sin Objetivo).
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

// NUEVO (2026-08-28): la hoja "Total Residuos" ya existía en el Sheet (headers
// Sucursal|Año|Mes|Residuo|Valorizado/No Valorizado|Respel no respel|Total
// KG|Total M3|Tons. CO2eq. evitadas, mismo formato que Euro), pero el visor
// nunca podía escribirle nada porque este Code.gs no tenía ni la función
// writeTotalResiduos ni la rama en doPost — portada tal cual de Code-Euro.gs.
//
// Busca en la columna A la fila cuyo valor sea exactamente "valorEsperado"
// (ej. "Sucursal") y devuelve el numero de fila (1-indexed). Evita asumir que
// el header esta en una fila fija, ya que esta hoja no tiene las filas
// decorativas de titulo/instrucciones que si tienen las 3 hojas principales.
function buscarFilaEncabezado_(sheet, valorEsperado) {
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow < 1) return null;
  var col = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    if (String(col[i][0]).trim() === valorEsperado) return i + 1;
  }
  return null;
}

function writeTotalResiduos(ss, data) {
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) throw new Error('Hoja "Total Residuos" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontro la fila de encabezado ("Sucursal") en Total Residuos');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();

  if (data.filas && data.filas.length > 0) {
    // Clave = Sucursal|Año|Mes (columnas A|B|C). No se incluye Residuo en la
    // clave a propósito: si el Excel nuevo trae un desglose distinto de
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


// ============================================================
// VISOR DE MINUTAS — lectura/escritura de la pestaña "Minuta"
// ============================================================

var SHEET_MINUTA_CANDIDATOS = ['Minuta ', 'Minuta', '📝 Minuta'];

function encontrarHojaMinuta_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < SHEET_MINUTA_CANDIDATOS.length; i++) {
    var sheet = ss.getSheetByName(SHEET_MINUTA_CANDIDATOS[i]);
    if (sheet) return sheet;
  }
  throw new Error('No se encontró la hoja de Minutas: ' + SHEET_MINUTA_CANDIDATOS.join(' / '));
}

/**
 * data.sessions viene del visor con esta forma:
 * [{ title, headerRow, dataStartRow, colMap:{item,cumplido,comentario,acuerdos,revisado},
 *    items:[{item, cumplido, comentario, acuerdos, revisado}, ...] }, ...]
 *
 * headerRow/dataStartRow/colMap vienen calculados por el visor a partir de la
 * misma lectura que acaba de mostrar en pantalla — no se busca por texto de
 * título y colMap dice en qué columna va cada campo (en Socovesa el
 * sub-encabezado es "Tema, Revisado, Detalle, Acuerdos, Resuelto" — el
 * visor lo detecta solo).
 */
function writeMinutas_(ss, data) {
  var sheet = encontrarHojaMinuta_();

  (data.sessions || []).forEach(function (session) {
    if (!session.headerRow) return; // sesión sin referencia de fila, se omite por seguridad
    var dataStartRow = session.dataStartRow || (session.headerRow + 1);
    var colMap = session.colMap || { item:0, cumplido:1, comentario:2, acuerdos:3, revisado:4 };

    var blockEnd = buscarFinBloqueMinuta_(sheet, dataStartRow);
    var currentSize = blockEnd - dataStartRow;
    var rows = session.items || [];
    var neededSize = rows.length;

    if (neededSize > currentSize) {
      sheet.insertRowsBefore(blockEnd, neededSize - currentSize);
    }

    for (var i = 0; i < neededSize; i++) {
      var row = rows[i];
      var targetRow = dataStartRow + i;
      sheet.getRange(targetRow, colMap.item + 1).setValue(row.item || '');
      sheet.getRange(targetRow, colMap.cumplido + 1).setValue(!!row.cumplido);
      sheet.getRange(targetRow, colMap.comentario + 1).setValue(row.comentario || '');
      sheet.getRange(targetRow, colMap.acuerdos + 1).setValue(row.acuerdos || '');
      sheet.getRange(targetRow, colMap.revisado + 1).setValue(!!row.revisado);
    }
  });
}

// El bloque de una sesión termina en la siguiente "fila de título" (columna A
// con contenido y el resto de columnas A:F vacío) o al llegar al final de la hoja.
function buscarFinBloqueMinuta_(sheet, fromRow) {
  var lastRow = sheet.getLastRow();
  var lastCol = Math.min(Math.max(sheet.getLastColumn(), 5), 6);
  for (var r = fromRow; r <= lastRow; r++) {
    var vals = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    if (esFilaDeTitulo_(vals)) return r;
  }
  return lastRow + 1;
}
function esFilaDeTitulo_(vals) {
  if (vals[0] === '' || vals[0] === null) return false;
  for (var i = 1; i < vals.length; i++) {
    if (vals[i] !== '' && vals[i] !== null) return false; // false/0 sí cuentan como "con contenido"
  }
  return true;
}

// Devuelve las filas crudas (A:F) de la pestaña Minuta vía JSONP, para que
// el visor las parsee con su propia lógica de sesiones.
function doGetMinutas_(e) {
  var payload;
  try {
    var sheet = encontrarHojaMinuta_();
    var lastRow = sheet.getLastRow();
    var lastCol = Math.max(sheet.getLastColumn(), 5);
    var rows = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
    payload = { rows: rows };
  } catch (err) {
    payload = { error: true, message: String(err) };
  }

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    var js = callback + "(" + JSON.stringify(payload) + ");";
    return ContentService.createTextOutput(js)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// VISOR NUEVO (COPEC/PMS/Abastible/Salfa-style)
// ============================================================

var EMPRESA_NOMBRE  = "Socovesa";
var EMPRESA_COLOR   = "#6941C6";    // ← violeta; cámbialo si tienen otro color de marca
var EMPRESA_COLOR_L = "#F9F5FF";

var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];
var SHEET_OBJ_CANDIDATOS   = ['🎯 Objetivos', 'Objetivos'];
var SHEET_OBJMAESTRO_CANDIDATOS = ['Objetivos 2026'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// Nota: Socovesa no tiene columna "Factura" en Trazabilidad_Docs — queda en
// null automáticamente (h.lastIndexOf devuelve -1 y el código lo maneja bien).
var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];

var COMENTARIO_HEADERS_CANDIDATOS = ["Comentario por sucursal", "Comentarios", "Comentario"];


function doGetVisor_(e) {
  var payload;
  try {
    var anioParam = e && e.parameter && e.parameter.anio;
    payload = buildPayload_(anioParam);
  } catch (err) {
    payload = { error: true, message: String(err) };
  }

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    var js = callback + "(" + JSON.stringify(payload) + ");";
    return ContentService.createTextOutput(js)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// FIX (2026-08-28): el visor asumia que TODA la informacion era de un solo
// año ("2026" hardcodeado en el frontend) — los lectores de Trazabilidad,
// Valorizacion y Objetivos nunca miraban la columna Año, asi que filas del
// mismo mes de años distintos (ej. "Enero 2023" y "Enero 2024") se
// mezclaban/pisaban entre si en el mismo balde de mes. Ahora buildPayload_
// recibe (opcionalmente) el año pedido por el visor (?anio=2023) y filtra
// Trazabilidad/Valorizacion/Objetivos-mensuales a ESE año exacto — mismo
// dato de siempre, pero sin mezclar años. Las obras (sucursales) igual se
// listan todas independiente del año elegido (ver leerTrazabilidad_). Las
// filas "Anual" de Objetivos NO se filtran por año (reflejan el estado
// actual, sin Año, igual que ya lo maneja valorizacion-recylink.html). El
// total m3 / fechas de la pestaña FGR (leerTotalResiduos_) tampoco se
// filtran — son historicos acumulados a proposito.
function buildPayload_(anioParam) {
  var aniosDisponibles = listarAniosDisponibles_();
  var anioSeleccionado = (anioParam && aniosDisponibles.indexOf(String(anioParam)) !== -1)
    ? String(anioParam)
    : aniosDisponibles[aniosDisponibles.length - 1];

  var traza = leerTrazabilidad_(anioSeleccionado);
  var val   = leerValorizacion_(anioSeleccionado);

  var empIdsValidos = {};
  Object.keys(traza.sucursales).forEach(function (empId) { empIdsValidos[empId] = true; });

  var cse   = leerCSE_(empIdsValidos);
  var objetivosPorEmpresa = leerObjetivos_(anioSeleccionado);
  var objetivosMaestro = leerObjetivosMaestro_();
  var totalResiduosPorEmpresa = leerTotalResiduos_(); // pestaña FGR — historico, no se filtra por año
  var empresas = construirEmpresas_(traza, val, cse, objetivosPorEmpresa, objetivosMaestro, totalResiduosPorEmpresa);
  var mesesActivos = calcularMesesActivos_(traza, val, cse);

  // FGR (a pedido del usuario, 2026-08-28): la tabla comparativa debe
  // mostrar TODAS las obras sin importar el año seleccionado, aunque el
  // sidebar (EMPRESAS) SI este filtrado por año — se arma por separado a
  // partir de traza.todasLasSucursales (sin filtro de año).
  var todasLasObrasFgr = Object.keys(traza.todasLasSucursales).sort().map(function (empId) {
    return {
      id: empId,
      sucursal: traza.todasLasSucursales[empId],
      fgr: construirFgrInfo_(empId, totalResiduosPorEmpresa)
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    EMPRESA_NOMBRE: EMPRESA_NOMBRE,
    EMPRESA_COLOR: EMPRESA_COLOR,
    EMPRESA_COLOR_L: EMPRESA_COLOR_L,
    MESES_ACTIVOS: mesesActivos,
    ANIOS_DISPONIBLES: aniosDisponibles,
    ANIO_SELECCIONADO: anioSeleccionado,
    EMPRESAS: empresas,
    TODAS_OBRAS_FGR: todasLasObrasFgr,
    VAL_DATA: val
  };
}


// ── Lectura de hojas ──

function encontrarHoja_(candidatos) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var i = 0; i < candidatos.length; i++) {
    var sheet = ss.getSheetByName(candidatos[i]);
    if (sheet) return sheet;
  }
  throw new Error("No se encontró ninguna hoja llamada: " + candidatos.join(" / "));
}

function getSheetRows_(candidatos) {
  var sheet = encontrarHoja_(candidatos);
  var data = sheet.getDataRange().getValues();
  var headerRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    var cell = String(data[i][0] || "").trim().toLowerCase();
    if (cell === "empresa_id") { headerRowIdx = i; break; }
  }
  if (headerRowIdx === -1) {
    throw new Error("No se encontró la fila de encabezado ('empresa_id') en: " + sheet.getName());
  }

  var header = data[headerRowIdx].map(function (h) { return String(h || "").trim(); });
  var rows = data.slice(headerRowIdx + 1);
  return { header: header, rows: rows };
}

// Escanea la columna "Año" de Trazabilidad_Docs/Valorización/Objetivos y
// devuelve la lista de años con datos, ordenada ascendente (["2021",
// "2022", ...]). Si ninguna fila tiene Año (Sheet viejo, sin esa columna
// todavia), devuelve el año actual como unica opcion.
function listarAniosDisponibles_() {
  var anios = {};
  function escanear(candidatos) {
    var sr;
    try { sr = getSheetRows_(candidatos); } catch (err) { return; }
    var idxAnio = sr.header.indexOf('Año');
    if (idxAnio === -1) return;
    sr.rows.forEach(function (r) {
      var a = String(r[idxAnio] || '').trim();
      if (a) anios[a] = true;
    });
  }
  escanear(SHEET_TRAZA_CANDIDATOS);
  escanear(SHEET_VAL_CANDIDATOS);
  escanear(SHEET_OBJ_CANDIDATOS);
  var lista = Object.keys(anios).sort();
  return lista.length ? lista : [String(new Date().getFullYear())];
}

// targetAnio: si se pasa, filtra las filas mensuales a ese año exacto
// (fila sin Año = se asume del año actual, mismo criterio que
// valorizacion-recylink.html). Las obras (sucursales) se listan TODAS
// independiente del año elegido, para que el sidebar no "pierda" obras
// cuyo unico historico sea de otro año.
function leerTrazabilidad_(targetAnio) {
  var sr = getSheetRows_(SHEET_TRAZA_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxAnio = h.indexOf("Año");
  var idxRes = h.indexOf("Residuo");
  var idxImp = h.indexOf("Importaciones");
  var docIdx = DOC_COLS.map(function (c) { return h.lastIndexOf(c); });
  var idxComentario = -1;
  for (var ci = 0; ci < COMENTARIO_HEADERS_CANDIDATOS.length && idxComentario === -1; ci++) {
    idxComentario = h.indexOf(COMENTARIO_HEADERS_CANDIDATOS[ci]);
  }

  var sucursales = {};          // solo obras con datos en targetAnio (sidebar)
  var todasLasSucursales = {};  // TODAS las obras, sin filtro de año (pestaña FGR)
  var porEmpresaMes = {};
  var comentariosPorEmpresaMes = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]);
    var residuo = String(r[idxRes] || "").trim();
    if (!mes || !residuo) return;

    // FIX (2026-08-28, a pedido del usuario): el sidebar solo debe mostrar
    // las obras que SI tienen registros de residuos en el año seleccionado.
    // Pero la pestaña FGR (comparativa entre TODAS las obras) debe seguir
    // mostrandolas todas sin importar el año — por eso se guardan ambos
    // mapas: "todasLasSucursales" (sin filtrar, para FGR) y "sucursales"
    // (filtrado por año, para el sidebar/resto del visor).
    todasLasSucursales[empId] = suc;

    var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
    if (!anioFila) anioFila = String(new Date().getFullYear());
    if (targetAnio && anioFila !== targetAnio) return;

    sucursales[empId] = suc;

    var docs = {};
    DOC_COLS.forEach(function (c, i) {
      var col = docIdx[i];
      docs[c] = col === -1 ? null : normalizeInt_(r[col]);
    });

    porEmpresaMes[empId] = porEmpresaMes[empId] || {};
    porEmpresaMes[empId][mes] = porEmpresaMes[empId][mes] || [];
    porEmpresaMes[empId][mes].push({
      nombre: residuo,
      imp: idxImp === -1 ? null : normalizeInt_(r[idxImp]),
      docs: docs
    });

    if (idxComentario !== -1) {
      var comentario = String(r[idxComentario] || "").trim();
      if (comentario) {
        comentariosPorEmpresaMes[empId] = comentariosPorEmpresaMes[empId] || {};
        comentariosPorEmpresaMes[empId][mes] = comentariosPorEmpresaMes[empId][mes] || {};
        comentariosPorEmpresaMes[empId][mes][comentario] = true;
      }
    }
  });

  return { sucursales: sucursales, todasLasSucursales: todasLasSucursales, porEmpresaMes: porEmpresaMes, comentarios: comentariosPorEmpresaMes };
}

function leerValorizacion_(targetAnio) {
  var sr = getSheetRows_(SHEET_VAL_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxTipo = h.indexOf("Tipo");
  var idxAnio = h.indexOf("Año");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var valData = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var tipo = String(r[idxTipo] || "").trim().toLowerCase();

    var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
    if (!anioFila) anioFila = String(new Date().getFullYear());
    if (targetAnio && anioFila !== targetAnio) return;

    valData[empId] = valData[empId] || { meses: {}, meta: {}, acumulado: {} };

    MESES.forEach(function (m, i) {
      var col = mesIdx[i];
      if (col === -1) return;
      var val = normalizePercent_(r[col]);
      if (val === null) return;
      if (tipo.indexOf("acumulado") !== -1) valData[empId].acumulado[m] = val;
      else if (tipo.indexOf("real") !== -1) valData[empId].meses[m] = val;
      else if (tipo.indexOf("meta") !== -1) valData[empId].meta[m] = val;
    });
  });

  return valData;
}

// Defensiva: si la pestaña Seguimiento_CSE no está o no tiene el formato
// esperado, devuelve datos vacíos en vez de romper el visor.
function leerCSE_(empIdsValidos) {
  var sr;
  try {
    sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  } catch (err) {
    return { cseData: {}, anualData: {} };
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxAccion = h.indexOf("Acción CSE");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var mapAccion = {
    "Correo seguimiento": "correo",
    "Reunión seguimiento": "reunion",
    "Encuesta seguimiento": "encuesta"
  };

  var cseData = {};
  var anualData = {};

  sr.rows.forEach(function (r) {
    var sucNombre = String(r[idxSuc] || "").trim();
    if (!sucNombre) return;

    var empId = normalizarSucursal_(sucNombre);
    if (!empIdsValidos[empId]) return;

    var accion = String(r[idxAccion] || "").trim();
    if (!accion) return;

    cseData[empId] = cseData[empId] || { correo: {}, reunion: {}, encuesta: {}, fechas: {} };
    anualData[empId] = anualData[empId] || {};
    anualData[empId][accion] = anualData[empId][accion] || {};

    var key = mapAccion[accion];

    MESES.forEach(function (m, i) {
      var col = mesIdx[i];
      if (col === -1) return;
      var v = normalizeSiNo_(r[col]);
      if (v === undefined) return;
      anualData[empId][accion][m] = v;
      if (key) cseData[empId][key][m] = v;
    });
  });

  return { cseData: cseData, anualData: anualData };
}

// ── NUEVO: lectura real de la hoja "🎯 Objetivos" ──
// Devuelve { empId: [ {texto, avance, ok, meta, detalle}, ... ] }
// - Filas "Anual" mandan sobre las filas mensuales para ese texto (ok/avance
//   fijos según "OK"/"No").
// - Filas mensuales (sin fila Anual para ese texto) usan el % de la última
//   fila mensual disponible (más reciente), igual que hace el visor legado.
// targetAnio: filtra las filas MENSUALES a ese año exacto (fila sin Año se
// asume del año actual). Las filas "Anual" NUNCA se filtran por año — son
// year-agnostic por diseño en todo el sistema (siempre reflejan el estado
// "actual", se sincronizan sin Año desde valorizacion-recylink.html).
function leerObjetivos_(targetAnio) {
  var sr;
  try {
    sr = getSheetRows_(SHEET_OBJ_CANDIDATOS);
  } catch (err) {
    return {};
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxAnio = h.indexOf("Año");
  var idxObj = h.indexOf("Objetivo");
  var idxPct = h.indexOf("% cumplimiento");
  var idxDet = h.indexOf("Detalle");

  var objByEmp = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var mes = String(r[idxMes] || "").trim();
    var texto = String(r[idxObj] || "").trim();
    if (!texto) return;

    if (mes.toLowerCase() !== "anual") {
      var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
      if (!anioFila) anioFila = String(new Date().getFullYear());
      if (targetAnio && anioFila !== targetAnio) return;
    }

    var valorRaw = idxPct === -1 ? null : r[idxPct];
    var detalle = idxDet === -1 ? "" : String(r[idxDet] || "").trim();

    objByEmp[empId] = objByEmp[empId] || {};
    var claveTexto = texto.toLowerCase();
    if (!objByEmp[empId][claveTexto]) {
      objByEmp[empId][claveTexto] = { texto: texto, avance: null, ok: null, meta: 100, detalle: "" };
    }
    var entry = objByEmp[empId][claveTexto];

    if (mes.toLowerCase() === "anual") {
      var valorStr = String(valorRaw || "").trim();
      // La planilla no siempre usa el literal "OK": a veces indica el
      // cumplimiento con un conteo (ej: "2 retiros"). Se considera cumplido
      // cualquier valor no vacío que no sea explícitamente "No".
      entry.ok = valorStr !== "" && !/^no$/i.test(valorStr);
      entry.avance = entry.ok ? 100 : 0;
      entry.detalle = detalle || (/^ok$/i.test(valorStr) ? entry.detalle : valorStr);
      entry._anualSeen = true;
    } else if (!entry._anualSeen) {
      var num = parsePctCumplimiento_(valorRaw);
      var idxMesNum = MESES.indexOf(normalizarMes_(mes));
      if (num !== null && (entry._lastMonthIdx === undefined || idxMesNum > entry._lastMonthIdx)) {
        entry.avance = num;
        entry.ok = num >= 100;
        entry.detalle = detalle; // siempre el del mes más reciente, aunque venga vacío
        entry._lastMonthIdx = idxMesNum;
      }
    }
  });

  var result = {};
  Object.keys(objByEmp).forEach(function (empId) {
    result[empId] = Object.keys(objByEmp[empId]).map(function (clave) {
      var o = objByEmp[empId][clave];
      delete o._anualSeen;
      delete o._lastMonthIdx;
      return o;
    });
  });
  return result;
}

// ── NUEVO: lista maestra de objetivos desde la pestaña "Objetivos 2026" ──
// Esa pestaña trae una sola fila (fila 2) con un texto de objetivo por
// columna. Se usa para que TODOS los objetivos definidos aparezcan en el
// visor por cada obra, aunque esa obra aún no tenga fila de avance cargada
// en "🎯 Objetivos" (en ese caso avance queda en null → el front lo muestra
// como "Sin dato").
function leerObjetivosMaestro_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = null;
  for (var i = 0; i < SHEET_OBJMAESTRO_CANDIDATOS.length; i++) {
    sheet = ss.getSheetByName(SHEET_OBJMAESTRO_CANDIDATOS[i]);
    if (sheet) break;
  }
  if (!sheet) return [];

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];

  // Busca la primera fila no vacía (normalmente la fila 2) y toma esos textos.
  var maxScan = Math.min(sheet.getLastRow(), 5);
  for (var r = 1; r <= maxScan; r++) {
    var fila = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    var textos = fila.map(function (v) { return String(v || "").trim(); }).filter(function (v) { return v !== ""; });
    if (textos.length > 0) return textos;
  }
  return [];
}

// ── NUEVO (pestaña FGR del visor): lectura de la hoja "Total Residuos"
// (Sucursal|Año|Mes|Residuo|Valorizado/No Valorizado|Respel no respel|
// Total KG|Total M3|Tons. CO2eq. evitadas) para sumar el total de m3
// registrados por obra y encontrar el mes+año del primer y ultimo registro
// de residuos. El FGR en si (m3/m2 construidos) NO se calcula aca — el
// visor lo calcula en el navegador, porque los m2 construidos son un dato
// manual que hoy no vive en ningun Sheet.
function leerTotalResiduos_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Total Residuos');
  if (!sheet) return {};
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) return {};
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < headerRow + 1) return {};

  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h || '').trim(); });
  var idxSuc = headers.indexOf('Sucursal');
  var idxAnio = headers.indexOf('Año');
  var idxMes = headers.indexOf('Mes');
  var idxM3 = headers.indexOf('Total M3');
  if (idxSuc === -1 || idxM3 === -1) return {};

  var data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
  var result = {};
  data.forEach(function (r) {
    var suc = String(r[idxSuc] || '').trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    if (!result[empId]) result[empId] = { totalM3: 0, registros: [] };

    var m3 = parseFloat(r[idxM3]) || 0;
    result[empId].totalM3 += m3;

    var anio = idxAnio === -1 ? '' : String(r[idxAnio] || '').trim();
    var mesNorm = idxMes === -1 ? '' : normalizarMes_(r[idxMes]);
    var idxMesNum = mesNorm ? MESES.indexOf(mesNorm) : -1;
    if (anio && idxMesNum !== -1) {
      result[empId].registros.push({ anio: anio, mes: mesNorm, orden: parseInt(anio, 10) * 100 + (idxMesNum + 1) });
    }
  });
  return result;
}

// Arma el objeto "fgr" ({totalM3, primerRegistro, ultimoRegistro}) de una
// obra a partir de lo que devolvio leerTotalResiduos_(). Compartido entre
// construirEmpresas_() (una obra a la vez) y buildPayload_() (para armar
// TODAS_OBRAS_FGR, sin filtro de año).
function construirFgrInfo_(empId, totalResiduosPorEmpresa) {
  var trInfo = (totalResiduosPorEmpresa || {})[empId] || { totalM3: 0, registros: [] };
  var registrosOrdenados = trInfo.registros.slice().sort(function (a, b) { return a.orden - b.orden; });
  var primerReg = registrosOrdenados[0] || null;
  var ultimoReg = registrosOrdenados[registrosOrdenados.length - 1] || null;
  return {
    totalM3: Math.round(trInfo.totalM3 * 100) / 100,
    primerRegistro: primerReg ? (primerReg.mes + ' ' + primerReg.anio) : null,
    ultimoRegistro: ultimoReg ? (ultimoReg.mes + ' ' + ultimoReg.anio) : null
  };
}


// ── Construcción del modelo para el visor ──

function construirEmpresas_(traza, val, cse, objetivosPorEmpresa, objetivosMaestro, totalResiduosPorEmpresa) {
  var empresas = [];

  Object.keys(traza.sucursales).sort().forEach(function (empId) {
    var sucursal = traza.sucursales[empId];

    var mensual = {};
    var mesesDeEstaSucursal = Object.keys(traza.porEmpresaMes[empId] || {});
    var comentariosEmp = traza.comentarios[empId] || {};
    mesesDeEstaSucursal.forEach(function (mes) {
      var comentariosMes = comentariosEmp[mes] || {};
      mensual[mes] = {
        residuos: traza.porEmpresaMes[empId][mes],
        pendiente: "",
        obs: Object.keys(comentariosMes).join(" · ")
      };
    });

    // ── Objetivos: se arma la lista completa a partir de "Objetivos 2026"
    // (la lista maestra de los 7 textos), rellenando el avance real de cada
    // uno desde la hoja "🎯 Objetivos" para ESTA obra si existe.
    // objetivosPorEmpresa[empId] llega como arreglo; lo indexamos por texto en minúscula
    var objRealesPorClave = {};
    (objetivosPorEmpresa[empId] || []).forEach(function (o) {
      objRealesPorClave[o.texto.toLowerCase()] = o;
    });

    var objetivos = [{ texto: "100% Trazabilidad" }]; // el front-end la recalcula en vivo

    (objetivosMaestro || []).forEach(function (textoMaestro) {
      if (/trazabilidad/i.test(textoMaestro)) return; // ya está cubierta arriba
      var real = objRealesPorClave[textoMaestro.toLowerCase()];
      if (real) {
        objetivos.push({
          texto: textoMaestro,
          avance: real.avance,
          ok: real.ok,
          meta: real.meta,
          detalle: real.detalle
        });
      } else {
        objetivos.push({ texto: textoMaestro, avance: null, ok: null, meta: 100, detalle: "" });
      }
    });

    // Si "Objetivos 2026" no tiene datos (hoja vacía o no encontrada), al
    // menos se agregan los objetivos reales que sí existan para esta obra
    // en "🎯 Objetivos" y que no se hayan agregado ya arriba.
    if (!objetivosMaestro || objetivosMaestro.length === 0) {
      (objetivosPorEmpresa[empId] || []).forEach(function (o) {
        if (/trazabilidad/i.test(o.texto)) return;
        objetivos.push(o);
      });
    }

    var valInfo = val[empId] || { meses: {}, meta: {}, acumulado: {} };
    var mesesValOrdenados = Object.keys(valInfo.meses)
      .sort(function (a, b) { return MESES.indexOf(a) - MESES.indexOf(b); });
    var ultimoMesVal = mesesValOrdenados[mesesValOrdenados.length - 1];

    var mesesAcumOrdenados = Object.keys(valInfo.acumulado || {})
      .sort(function (a, b) { return MESES.indexOf(a) - MESES.indexOf(b); });
    var ultimoMesAcum = mesesAcumOrdenados[mesesAcumOrdenados.length - 1];

    var avanceVal = ultimoMesAcum !== undefined
      ? valInfo.acumulado[ultimoMesAcum]
      : (ultimoMesVal !== undefined ? valInfo.meses[ultimoMesVal] : null);

    var metaVal = (ultimoMesVal !== undefined && valInfo.meta[ultimoMesVal] !== undefined)
      ? valInfo.meta[ultimoMesVal] : null;

    var textoVal = metaVal !== null ? (metaVal + "% Valorización") : "Meta Valorización (sin definir)";
    objetivos.push({
      texto: textoVal,
      avance: avanceVal,
      ok: (metaVal !== null && avanceVal !== null) ? (avanceVal >= metaVal) : null
    });

    var cseInfo = cse.cseData[empId] || { correo: {}, reunion: {}, encuesta: {}, fechas: {} };
    var anualInfo = cse.anualData[empId] || {};

    empresas.push({
      id: empId,
      nombre: EMPRESA_NOMBRE,
      sucursal: sucursal,
      letra: letraFromSucursal_(sucursal),
      color: EMPRESA_COLOR,
      colorBg: EMPRESA_COLOR_L,
      logo: null,
      objetivos: objetivos,
      cse: cseInfo,
      mensual: mensual,
      anual: anualInfo,
      fgr: construirFgrInfo_(empId, totalResiduosPorEmpresa)
    });
  });

  return empresas;
}

// OJO (2026-09-03): no escanear val[emp].meta acá — syncMetas() (cliente)
// escribe el mismo valor de meta repetido en los 12 meses del año
// (Enero..Diciembre) sin importar si hay actividad real esos meses, así que
// incluir "meta" en este cálculo hacía que MESES_ACTIVOS siempre llegara
// hasta Diciembre en vez del último mes con datos reales (bug real,
// encontrado en Code-Vital.gs y portado acá). Solo "meses" (% Real) y
// "acumulado" (% Acumulado) reflejan actividad real.
function calcularMesesActivos_(traza, val, cse) {
  var maxIdx = -1;
  function scan(obj) {
    Object.keys(obj || {}).forEach(function (m) {
      var idx = MESES.indexOf(m);
      if (idx > maxIdx) maxIdx = idx;
    });
  }
  Object.keys(traza.porEmpresaMes).forEach(function (emp) { scan(traza.porEmpresaMes[emp]); });
  Object.keys(val).forEach(function (emp) { scan(val[emp].meses); scan(val[emp].acumulado); });
  Object.keys(cse.anualData).forEach(function (emp) {
    Object.keys(cse.anualData[emp]).forEach(function (accion) { scan(cse.anualData[emp][accion]); });
  });
  if (maxIdx < 0) return [];
  return MESES.slice(0, maxIdx + 1);
}


// ── Helpers de normalización ──

function normalizarMes_(raw) {
  var m = String(raw || "").trim();
  if (!m) return "";
  for (var i = 0; i < MESES.length; i++) {
    if (MESES[i].toLowerCase() === m.toLowerCase()) return MESES[i];
  }
  return m;
}

function normalizarSucursal_(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeInt_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  var n = Number(raw);
  return isNaN(n) ? null : n;
}

function normalizePercent_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    var pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(pct * 10) / 10;
  }
  var s = String(raw).trim();
  if (s === "") return null;
  s = s.replace("%", "").replace(",", ".");
  var n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}

function normalizeSiNo_(raw) {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  var s = String(raw).trim().toUpperCase();
  if (s === "SI" || s === "SÍ") return true;
  if (s === "NO") return false;
  return undefined;
}

function letraFromSucursal_(s) {
  var stop = ["de", "la", "el", "los", "las", "del", "y"];
  var words = String(s || "").split(/\s+/).filter(function (w) {
    return w && stop.indexOf(w.toLowerCase()) === -1;
  });
  var letras = words.slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  if (letras.length < 2 && s && s.length >= 2) letras = s.substring(0, 2).toUpperCase();
  return letras || "??";
}


// ============================================================
// VISOR LEGADO "de Trazabilidad" (index__2_.html) — SIN CAMBIOS
// Sigue funcionando exactamente igual, con ?callback=X (+ ?suc= opcional)
// y sin ?visor=1.
// ============================================================

const MESES_ = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto",
                "Septiembre","Octubre","Noviembre","Diciembre"];

function getSheet_(ss, nombreConEmoji, nombreSinEmoji) {
  return ss.getSheetByName(nombreConEmoji) || ss.getSheetByName(nombreSinEmoji);
}

function filasDesdeHeader_(sheet) {
  if (!sheet) return [];
  const maxScan = Math.min(sheet.getLastRow(), 15);
  if (maxScan < 1) return [];
  const colA = sheet.getRange(1, 1, maxScan, 1).getValues();
  let headerRow = -1;
  for (let i = 0; i < colA.length; i++) {
    if (String(colA[i][0] || "").trim().toLowerCase() === "empresa_id") { headerRow = i + 1; break; }
  }
  if (headerRow === -1) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= headerRow) return [];
  const numCols = sheet.getLastColumn();
  const data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, numCols).getValues();
  return data.filter(r => String(r[0] || "").trim() !== "");
}

function buildVisorPayload_(sucFiltro) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const docsRows = filasDesdeHeader_(getSheet_(ss, '📊 Trazabilidad_Docs', 'Trazabilidad_Docs'));
  const valRows  = filasDesdeHeader_(getSheet_(ss, '♻️ Valorización', 'Valorización'));
  const objRows  = filasDesdeHeader_(getSheet_(ss, '🎯 Objetivos', 'Objetivos'));
  const cseRows  = filasDesdeHeader_(getSheet_(ss, '👥 Seguimiento_CSE', 'Seguimiento_CSE'));
  const cfgRows  = filasDesdeHeader_(getSheet_(ss, '⚙️ Empresas_Config', 'Empresas_Config'));

  const cfgById = {};
  cfgRows.forEach(r => {
    const id = String(r[0] || "").trim();
    if (!id) return;
    cfgById[id] = { empresa_nombre: r[1], sucursal: r[2], color_hex: r[3], meta_val: r[4], logo_url: r[5], activa: r[6] };
  });

  const empresasMap = {};
  function getEmp_(id, sucursalFallback) {
    if (!empresasMap[id]) {
      const cfg = cfgById[id] || {};
      empresasMap[id] = {
        id: id,
        sucursal: cfg.sucursal || sucursalFallback || id,
        logo: cfg.logo_url || null,
        mensual: {}, objetivos: [], cse: {}
      };
    }
    return empresasMap[id];
  }

  const mesesConDatos = {};

  docsRows.forEach(r => {
    const id = String(r[0] || "").trim();
    if (!id || (sucFiltro && id !== sucFiltro)) return;
    const mes = String(r[2] || "").trim(), residuo = String(r[3] || "").trim();
    if (!mes || !residuo) return;
    const emp = getEmp_(id, r[1]);
    if (!emp.mensual[mes]) emp.mensual[mes] = { residuos: [], obs: "" };
    const imp = toNumOrNull_(r[6]);
    emp.mensual[mes].residuos.push({
      nombre: residuo,
      imp: imp == null ? 0 : imp,
      docs: {
        "Cert. tratamiento": toNumOrNull_(r[7]),
        "Cert. declaración": toNumOrNull_(r[8]),
        "Transportista":     toNumOrNull_(r[9]),
        "Disposición final": toNumOrNull_(r[10])
      }
    });
    mesesConDatos[mes] = true;
  });

  const VAL_DATA = {};
  valRows.forEach(r => {
    const id = String(r[0] || "").trim();
    if (!id || (sucFiltro && id !== sucFiltro)) return;
    const tipo = String(r[2] || "").trim().toLowerCase();
    if (!VAL_DATA[id]) VAL_DATA[id] = { meta: {}, meses: {}, acumulado: {} };
    MESES_.forEach((mes, i) => {
      const v = toNumOrNull_(r[3 + i]);
      if (v == null) return;
      if (tipo.indexOf("meta") >= 0) VAL_DATA[id].meta[mes] = v;
      else { VAL_DATA[id].meses[mes] = v; VAL_DATA[id].acumulado[mes] = v; }
      mesesConDatos[mes] = true;
    });
  });

  const objByEmp = {};
  objRows.forEach(r => {
    const id = String(r[0] || "").trim();
    if (!id || (sucFiltro && id !== sucFiltro)) return;
    const mes = String(r[2] || "").trim(), texto = String(r[3] || "").trim();
    if (!texto) return;
    const valor = r[4], detalle = r[5];
    if (!objByEmp[id]) objByEmp[id] = {};
    if (!objByEmp[id][texto]) objByEmp[id][texto] = { texto, ok: null, avance: null, meta: 100, detalle: "" };
    const entry = objByEmp[id][texto];
    if (mes.toLowerCase() === "anual") {
      const valorStr = String(valor || "").trim();
      entry.ok = /^ok$/i.test(valorStr);
      entry.avance = entry.ok ? 100 : 0;
      entry.detalle = detalle || "";
      entry._anualSeen = true;
    } else if (!entry._anualSeen) {
      const num = parsePct_(valor);
      if (num != null) { entry.avance = num; entry.ok = num >= 100; }
      mesesConDatos[mes] = true;
    }
  });
  Object.keys(objByEmp).forEach(id => {
    const emp = getEmp_(id);
    emp.objetivos = Object.keys(objByEmp[id]).map(t => { const o = objByEmp[id][t]; delete o._anualSeen; return o; });
  });

  cseRows.forEach(r => {
    const id = String(r[0] || "").trim();
    if (!id || (sucFiltro && id !== sucFiltro)) return;
    const mes = String(r[2] || "").trim(), accion = String(r[3] || "").trim().toLowerCase();
    const valor = String(r[4] || "").trim().toUpperCase();
    if (!mes || !accion) return;
    let key = null;
    if (accion.indexOf("reun") >= 0) key = "reunion";
    else if (accion.indexOf("correo") >= 0) key = "correo";
    if (!key) return;
    const emp = getEmp_(id);
    if (!emp.cse[key]) emp.cse[key] = {};
    emp.cse[key][mes] = valor === "SI" ? true : (valor === "NO" ? false : null);
    mesesConDatos[mes] = true;
  });

  let MESES_ACTIVOS = MESES_.filter(m => mesesConDatos[m]);
  if (MESES_ACTIVOS.length === 0) MESES_ACTIVOS = ["Enero"];

  const EMPRESAS = Object.keys(empresasMap)
    .map(id => empresasMap[id])
    .sort((a, b) => String(a.sucursal || "").localeCompare(String(b.sucursal || "")));

  return { EMPRESAS, VAL_DATA, MESES_ACTIVOS };
}

function toNumOrNull_(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parsePct_(v) {
  if (v === "" || v === null || v === undefined) return null;
  const s = String(v).trim().replace("%", "").replace(",", ".");
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}

// Para la columna "% cumplimiento" de la hoja "🎯 Objetivos": si la celda
// está formateada como porcentaje en Sheets, getValues() la entrega como
// fracción numérica (ej: 1 = 100%, 0.667 = 66.7%), NO como texto "100,00%".
// Si en cambio llega como texto (celda sin formato %), se parsea igual que
// parsePct_. Sin este ajuste, un 100% se leía como "1" (1%).
function parsePctCumplimiento_(raw) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    var pct = raw <= 1 ? raw * 100 : raw;
    return Math.round(pct * 10) / 10;
  }
  return parsePct_(raw);
}

/** Prueba manual desde el editor: revisa el JSON en el Log de ejecución */
function _testVisor() {
  Logger.log(JSON.stringify(buildVisorPayload_(null), null, 2).slice(0, 4000));
}


// ============================================================
// DOGET FUSIONADO — despacha según el parámetro de la URL
// ============================================================

function doGet(e) {
  const params = (e && e.parameter) || {};

  if (params.minutas === '1') return doGetMinutas_(e);
  if (params.visor === '1') return doGetVisor_(e);

  // Sin esos parámetros: comportamiento EXACTO al que ya tenías.
  return doGetLegacyYClasico_(e);
}

// ── LO QUE YA TENÍAS, RENOMBRADO (comportamiento intacto, incluido ?suc=) ──
function doGetLegacyYClasico_(e) {
  const params    = (e && e.parameter) || {};
  const callback  = params.callback;
  const sucFiltro = params.suc;

  if (callback) {
    let payload;
    try {
      payload = buildVisorPayload_(sucFiltro);
    } catch (err) {
      payload = { error: true, message: String(err) };
    }
    const json = JSON.stringify(payload);
    return ContentService
      .createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // ── Formato original, SIN CAMBIOS ─────────────────────────
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const startRow = 6;

  function readSheet(nombre) {
    const sheet = ss.getSheetByName(nombre);
    if (!sheet || sheet.getLastRow() < startRow) return [];
    const headers = sheet.getRange(5, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, sheet.getLastColumn()).getValues();
    return data
      .filter(r => r[0] !== '')
      .map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      });
  }

  const result = {
    valorizacion: readSheet('♻️ Valorización') || readSheet('Valorización'),
    trazabilidad: readSheet('📊 Trazabilidad_Docs') || readSheet('Trazabilidad_Docs'),
    objetivos: readSheet('🎯 Objetivos') || readSheet('Objetivos')
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── Utilidades para probar desde el editor ──

// Ejecutar → testBuildPayload, luego revisa Ver → Registros de ejecución
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}

// Ejecutar → testReadMinutas, luego revisa Ver → Registros de ejecución
function testReadMinutas() {
  var sheet = encontrarHojaMinuta_();
  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 5);
  var rows = lastRow > 0 ? sheet.getRange(1, 1, lastRow, lastCol).getValues() : [];
  Logger.log(JSON.stringify(rows.slice(0, 40), null, 2));
}

// Ejecutar → testWriteMinutas, luego revisa Ver → Registros de ejecución.
// NOTA: ajusta headerRow/dataStartRow/colMap a una sesión real de tu pestaña
// Minuta (usa testReadMinutas() para ver los números de fila y el orden real
// de columnas) antes de correrlo.
function testWriteMinutas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fakeData = {
    sessions: [
      {
        title: "Prueba",
        headerRow: 1,
        dataStartRow: 3,
        colMap: { item:0, cumplido:4, comentario:2, acuerdos:3, revisado:1 }, // orden de Socovesa: Tema,Revisado,Detalle,Acuerdos,Resuelto
        items: [
          { item: "Ítem de prueba (borrar después)", cumplido: true, comentario: "Comentario de prueba", acuerdos: "Acuerdo de prueba", revisado: true }
        ]
      }
    ]
  };
  writeMinutas_(ss, fakeData);
  Logger.log("Listo — revisa la hoja de Minutas.");
}
