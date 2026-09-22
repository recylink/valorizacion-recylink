/**
 * ============================================================
 * RECYLINK · Apps Script del Sheet de ANDO — VERSIÓN FUSIONADA
 * ============================================================
 * FUSIÓN (2026-09-22, a pedido del usuario: "quiero un code que se
 * comunique con valorización y visor"): es UN SOLO Apps Script (un solo
 * despliegue) el que atiende tanto a valorizacion-recylink.html (app
 * principal) como al repo "Visor-de-Objetivos-ANDO" (GitHub Pages,
 * standalone) — confirmado por el usuario. En el repo, sin embargo,
 * había 2 archivos (Code-Ando.gs y Code-Ando-Visor.gs) que habían
 * quedado como snapshots desincronizados de ese mismo script real,
 * pegados en momentos distintos: Code-Ando-Visor.gs (2026-09-03) ya
 * tenía el fix de Año en la clave de borrado; Code-Ando.gs (más viejo
 * en el repo) no. Este archivo fusiona ambos snapshots en uno solo —
 * mismo patrón "versión fusionada" que ya usan Code.gs (Copec)/
 * Code-Euro.gs/Code-Socovesa.gs: un solo doGet que despacha según el
 * parámetro de la URL, y un solo doPost con todos los tipos de sync.
 * Se pega en el ÚNICO proyecto de Apps Script real (no hay 2
 * despliegues que actualizar).
 *
 *  1) LA APP PRINCIPAL (valorizacion-recylink.html):
 *     - doPost: escribe valorización/metas/trazabilidad/objetivos/
 *       total residuos/costo e ingreso.
 *     - doGet "clásico" (sin ?visor=1 ni ?callback): devuelve el
 *       volcado plano de las hojas, comportamiento intacto.
 *
 *  2) EL VISOR STANDALONE (Visor-de-Objetivos-ANDO):
 *     - Se activa con ?callback=... o ?visor=1.
 *     - Incluye Seguimiento CSE editable (tipo:'cse') y Costo e
 *       Ingreso por sucursal.
 *
 *  3) EL VISOR DE MINUTAS (integrado al visor de objetivos):
 *     - Se activa con ?minutas=1.
 *
 * Al fusionar se resolvieron 2 diferencias reales entre ambos archivos
 * (se usó siempre la versión más segura/correcta de las dos):
 *   - writeCostoIngreso: Code-Ando.gs reemplazaba TODA la hoja en cada
 *     sync (perdía meses/años no incluidos en el Excel actual);
 *     Code-Ando-Visor.gs solo reemplazaba por clave Sucursal+Año+Mes.
 *     Se usó la versión de Code-Ando-Visor.gs (no pierde histórico).
 *   - writeValorizacion/writeMetas/writeTrazabilidad/writeObjetivos: se
 *     usó la versión ya corregida el 2026-09-22 (clave de borrado con
 *     Año, y Objetivo en la posición correcta) — ver detalle en cada
 *     función más abajo.
 *
 * Requiere que el Sheet tenga las pestañas "Total Residuos" (headers:
 * Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel
 * | Total KG | Total M3), "RESPEL" (headers: Residuo | RESPEL) y "Costo
 * e Ingreso" (headers: Sucursal | Año | Mes | Residuo | Total KG | Costo
 * Total | Ingreso Total | Neto) ya creadas. Ando no usa "Tons. CO2eq.
 * evitadas" (exclusiva de Euro, decisión del usuario 2026-07-27).
 *
 * Nota: la hoja Trazabilidad_Docs de Ando tiene una columna extra al
 * final ("Comentario por sucursal") que no está en trazCols del HTML —
 * writeTrazabilidad borra y reinserta la fila completa en cada sync, así
 * que cualquier comentario manual en esa columna se pierde al sincronizar.
 * ============================================================
 */


// ============================================================
// 1) DOPOST — escribe todos los tipos de sync (app principal + visor)
// ============================================================

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
    else if (tipo === 'costoIngreso') writeCostoIngreso(ss, data);
    else if (tipo === 'cse') writeCSE_(ss, data); // Seguimiento CSE editable (visor)
    else if (tipo === 'minutas') writeMinutas_(ss, data); // Visor de Minutas

    return ContentService
      .createTextOutput(JSON.stringify({ok: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// FIX (2026-09-22): la clave de borrado no incluía el Año, aunque el
// cliente SÍ lo manda para Ando desde que se agregó 'ando' a
// EMPRESAS_VAL_CON_ANIO (fila real: [empresa_id,Sucursal,Tipo,Año,
// Enero..Diciembre]) — sincronizar "% Real" de un año podía borrar de
// paso el mismo Tipo de OTRO año.
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

// FIX (2026-09-22, mismo caso que writeValorizacion arriba): sin el Año en
// la comparación, la Meta % de un año sobreescribía la de OTRO año que ya
// había matcheado por empresa_id+"Meta %".
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

// FIX (2026-09-22, mismo caso que writeValorizacion arriba): 'ando' también
// está en EMPRESAS_OBJ_CON_ANIO — la fila real es
// [empresa_id,Sucursal,Mes,Año,Residuo,...] pero la clave de borrado seguía
// comparando solo empresa_id+Mes, sin Año.
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

// Borra solo las filas cuyo empresa_id+mes+año+Objetivo coincide EXACTO
// con lo que se está reinsertando (no por prefijo de empresa completo),
// para no perder histórico de objetivos de otras sucursales/meses/años al
// sincronizar.
// FIX (2026-08-14): antes borraba por empresa_id+mes, lo que hacia que
// sincronizar un objetivo calculado (trazabilidad, sinader, etc.) borrara de
// paso las filas de objetivos "manual" de la MISMA sucursal+mes.
// FIX (2026-09-22): al agregarse la columna Año, el texto del Objetivo pasó
// de la posición 3 a la 4 — la clave de borrado seguía usando f[3] (ahora
// Año, no Objetivo), así que sincronizar CUALQUIER objetivo calculado
// borraba TODOS los demás objetivos (incluidos los manuales) de ese mismo
// mes+año. Se corrige a empresa_id+Mes+Año+Objetivo (índices 0,2,3,4).
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
// Evita asumir que el header esta en una fila fija, ya que estas hojas no
// tienen las filas decorativas de titulo/instrucciones que si tienen las
// 3 hojas principales.
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
  var numCols = 7; // Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    sheet.getRange(startRow, 1, lastRow - startRow + 1, numCols).clearContent();
  }
  if (data.filas && data.filas.length > 0) {
    sheet.getRange(startRow, 1, data.filas.length, data.filas[0].length).setValues(data.filas);
  }
}

// ── Costo e Ingreso por residuo ──
// Alimenta el seguimiento del KPI "costo e ingreso" (objetivo kpi_costo):
// una fila por Sucursal+Año+Mes+Residuo con el costo de transporte y el
// ingreso por venta acumulados. La clave de borrado es Sucursal+Año+Mes
// (NO reemplaza la hoja completa) para no perder histórico entre años al
// subir el Excel de un solo mes — versión unificada al fusionar
// Code-Ando.gs/Code-Ando-Visor.gs (2026-09-22): Code-Ando.gs reemplazaba
// toda la hoja en cada sync; se usó esta versión, ya correcta, del visor.
function writeCostoIngreso(ss, data) {
  var sheet = ss.getSheetByName('Costo e Ingreso');
  if (!sheet) throw new Error('Hoja "Costo e Ingreso" no encontrada');
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) throw new Error('No se encontró la fila de encabezado ("Sucursal") en Costo e Ingreso');
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();

  if (data.filas && data.filas.length > 0) {
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

// Lee "Costo e Ingreso" agrupado por sucursal (empresa_id) → mes → residuos[],
// con totales agregados por mes. Usada solo por el visor standalone.
// targetAnio: filtra por la columna Año (col. B) — mismo criterio que
// leerTrazabilidad_/leerValorizacion_/leerObjetivosReales_.
function leerCostoIngreso_(targetAnio) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Costo e Ingreso');
  if (!sheet) return {};
  var headerRow = buscarFilaEncabezado_(sheet, 'Sucursal');
  if (!headerRow) return {};
  var startRow = headerRow + 1;
  var lastRow = sheet.getLastRow();
  if (lastRow < startRow) return {};
  var rows = sheet.getRange(startRow, 1, lastRow - startRow + 1, 8).getValues();

  var result = {}; // empId -> mes -> { residuos:[...], totales:{...} }
  rows.forEach(function (r) {
    var suc = String(r[0] || '').trim();
    var anioFila = String(r[1] || '').trim() || String(new Date().getFullYear());
    if (targetAnio && anioFila !== targetAnio) return;
    var mes = normalizarMes_(r[2]);
    var residuo = String(r[3] || '').trim();
    if (!suc || !mes) return;
    var empId = normalizarSucursal_(suc);
    var totalKg = Number(r[4]) || 0;
    var costoTotal = Number(r[5]) || 0;
    var ingresoTotal = Number(r[6]) || 0;
    var neto = (r[7] !== '' && r[7] !== null && r[7] !== undefined) ? Number(r[7]) : (ingresoTotal - costoTotal);

    result[empId] = result[empId] || {};
    if (!result[empId][mes]) {
      result[empId][mes] = { residuos: [], totales: { totalKg: 0, costoTotal: 0, ingresoTotal: 0, neto: 0 } };
    }
    result[empId][mes].residuos.push({ residuo: residuo, totalKg: totalKg, costoTotal: costoTotal, ingresoTotal: ingresoTotal, neto: neto });
    result[empId][mes].totales.totalKg += totalKg;
    result[empId][mes].totales.costoTotal += costoTotal;
    result[empId][mes].totales.ingresoTotal += ingresoTotal;
    result[empId][mes].totales.neto += neto;
  });
  return result;
}

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

// Dump genérico de "👥 Seguimiento_CSE" para la app principal (doGetClasico_),
// mismo formato que readCseSheet_() en Code-Euro.gs — filas como objetos
// {empresa_id, Sucursal, "Acción CSE", Enero...Diciembre}. Para que
// calcObjetivos() en la app principal pueda auto-completar "Generar
// sensibilización..." a partir de la acción "Charlas".
function readCseSheetClasico_() {
  var sr;
  try {
    sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  } catch (err) {
    return [];
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  return sr.rows.filter(function (r) { return idxSuc !== -1 && String(r[idxSuc] || "").trim() !== ""; }).map(function (r) {
    var obj = {};
    h.forEach(function (hh, i) { if (hh) obj[hh] = r[i]; });
    return obj;
  });
}

// Seguimiento CSE editable. Guarda in-place (por empresa_id +
// "Acción CSE") los valores SI/NO por mes que edita el visor; si la fila
// empresa_id+accion no existe todavía la crea. data.filas viene como
// [{empresaId, sucursal, accion, valores:{Mes:"SI"/"NO"/""}}, ...] — el
// texto de "accion" tiene que coincidir EXACTO con lo que espera
// leerCSE_()/mapAccion más abajo ("Correo seguimiento"/"Reunión
// seguimiento"/"Charlas").
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
  var colAccion = idx['Acción CSE'] || idx['Accion CSE'];
  var colSucursal = idx['Sucursal'];
  if (!colEmpresa || !colAccion) throw new Error('Encabezados "empresa_id"/"Acción CSE" no encontrados en Seguimiento_CSE');

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


// ============================================================
// 2) DOGET FUSIONADO — despacha según el parámetro de la URL
// ============================================================

function doGet(e) {
  const quiereMinutas = e && e.parameter && e.parameter.minutas === '1';
  if (quiereMinutas) return doGetMinutas_(e);

  const quiereVisor = e && e.parameter && (e.parameter.callback || e.parameter.visor === '1');
  if (quiereVisor) return doGetVisor_(e);
  return doGetClasico_(e);
}

// ── APP PRINCIPAL, comportamiento intacto (+ respel + cse) ──
function doGetClasico_(e) {
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
    cse: readCseSheetClasico_()
  };

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── VISOR DE TRAZABILIDAD (standalone) ──

var EMPRESA_NOMBRE  = "ANDO";
var EMPRESA_COLOR   = "#175CD3";
var EMPRESA_COLOR_L = "#EFF8FF";

var SHEET_TRAZA_CANDIDATOS = ['📊 Trazabilidad_Docs', 'Trazabilidad_Docs'];
var SHEET_VAL_CANDIDATOS   = ['♻️ Valorización', 'Valorización'];
var SHEET_CSE_CANDIDATOS   = ['👥 Seguimiento_CSE', 'Seguimiento_CSE'];

var MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

var DOC_COLS = ["Cert. tratamiento","Factura","Cert. declaración","Transportista","Disposición final"];

// Algunas empresas tienen una columna de comentario libre por sucursal en
// Trazabilidad_Docs; el nombre exacto varía, así que probamos varios.
var COMENTARIO_HEADERS_CANDIDATOS = ["Comentario por sucursal", "Comentarios", "Comentario"];


function doGetVisor_(e) {
  var payload;
  try {
    var anioParam = e && e.parameter && e.parameter.anio;
    payload = buildPayload_(anioParam);

    // Filtro por sucursal (para links externos): ?suc=<id_de_sucursal>
    var sucFiltro = e && e.parameter && e.parameter.suc;
    if (sucFiltro) {
      payload.EMPRESAS = payload.EMPRESAS.filter(function (em) { return em.id === sucFiltro; });
      var valFiltrado = {};
      if (payload.VAL_DATA[sucFiltro]) valFiltrado[sucFiltro] = payload.VAL_DATA[sucFiltro];
      payload.VAL_DATA = valFiltrado;
    }
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

// buildPayload_ recibe (opcionalmente) el año pedido por el visor (?anio=2026)
// y filtra Trazabilidad/Valorización/Objetivos-mensuales/Costo e Ingreso a
// ESE año exacto. Las obras (sucursales) del sidebar solo listan las que
// tienen datos en el año elegido. Las filas "Anual" de Objetivos nunca se
// filtran por año.
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
  var objetivosReales = leerObjetivosReales_(anioSeleccionado);
  var costoIngreso = leerCostoIngreso_(anioSeleccionado);
  var empresas = construirEmpresas_(traza, val, cse, objetivosReales);
  empresas.forEach(function (e) { e.costoIngreso = costoIngreso[e.id] || {}; });
  var mesesActivos = calcularMesesActivos_(traza, val, cse);

  return {
    generatedAt: new Date().toISOString(),
    EMPRESA_NOMBRE: EMPRESA_NOMBRE,
    EMPRESA_COLOR: EMPRESA_COLOR,
    EMPRESA_COLOR_L: EMPRESA_COLOR_L,
    MESES_ACTIVOS: mesesActivos,
    ANIOS_DISPONIBLES: aniosDisponibles,
    ANIO_SELECCIONADO: anioSeleccionado,
    EMPRESAS: empresas,
    VAL_DATA: val
  };
}

// Escanea la columna "Año" de Trazabilidad_Docs/Valorización/Objetivos y
// devuelve la lista de años con datos, ordenada ascendente. Si ninguna fila
// tiene Año todavía, devuelve el año actual como única opción.
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
  escanear(['🎯 Objetivos', 'Objetivos']);
  var lista = Object.keys(anios).sort();
  return lista.length ? lista : [String(new Date().getFullYear())];
}


// ── Lectura de hojas (visor) ──

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

// targetAnio: si se pasa, filtra las filas a ese año exacto (fila sin Año
// se asume del año actual, mismo criterio que valorizacion-recylink.html).
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

  var sucursales = {};
  var porEmpresaMes = {};
  var comentariosPorEmpresaMes = {};

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    if (!suc) return;
    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]);
    var residuo = String(r[idxRes] || "").trim();
    if (!mes || !residuo) return;

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

  return { sucursales: sucursales, porEmpresaMes: porEmpresaMes, comentarios: comentariosPorEmpresaMes };
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

function leerCSE_(empIdsValidos) {
  var sr = getSheetRows_(SHEET_CSE_CANDIDATOS);
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxAccion = h.indexOf("Acción CSE");
  var mesIdx = MESES.map(function (m) { return h.indexOf(m); });

  var mapAccion = {
    "Correo seguimiento": "correo",
    "Reunión seguimiento": "reunion",
    "Charlas": "encuesta",
    "Encuesta seguimiento": "encuesta" // texto viejo, por si quedó alguna fila así en el Sheet
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


// ── Construcción del modelo para el visor ──

// Los 4 objetivos reales de Ando son trazabilidad/sinader/sensibilizacion/
// kpi_costo (ver EMPRESAS.ando.objetivos en valorizacion-recylink.html) — el
// texto tiene que coincidir EXACTO con lo que escribe calcObjetivos() en la
// hoja "🎯 Objetivos". NO incluyen Valorización, así que no se agrega una
// tarjeta sintética de "% Valorización" en objetivos — ese dato sigue
// disponible aparte en VAL_DATA/renderValorizacion().
var ANDO_OBJETIVOS_TEXTOS = [
  "100% trazabilidad",
  "Cumplimiento normativa SINADER",
  "Generar sensibilización, concientización y cultura ambiental",
  "Incorporar KPI de costo - valorización"
];

function construirEmpresas_(traza, val, cse, objetivosReales) {
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

    var propios = (objetivosReales && objetivosReales[empId]) || {};
    var objetivos = ANDO_OBJETIVOS_TEXTOS.map(function (texto) {
      var d = propios[texto];
      return d
        ? { texto: texto, avance: d.avance, ok: d.ok, detalle: d.detalle }
        : { texto: texto, avance: null, ok: null, detalle: "" };
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
      anual: anualInfo
    });
  });

  return empresas;
}

// No se escanea val[emp].meta ni val[emp].acumulado — ambas quedan
// pobladas para meses sin actividad real (meta se repite en los 12 meses;
// acumulado se arrastra hacia adelante), lo que haría que el mes por
// defecto del visor siempre saltara a Diciembre. Solo "meses" (% Real)
// refleja actividad real.
function calcularMesesActivos_(traza, val, cse) {
  var maxIdx = -1;
  function scan(obj) {
    Object.keys(obj || {}).forEach(function (m) {
      var idx = MESES.indexOf(m);
      if (idx > maxIdx) maxIdx = idx;
    });
  }
  Object.keys(traza.porEmpresaMes).forEach(function (emp) { scan(traza.porEmpresaMes[emp]); });
  Object.keys(val).forEach(function (emp) { scan(val[emp].meses); });
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

// Lee la hoja real "🎯 Objetivos" (empresa_id | Sucursal | Mes | Año |
// Objetivo | % cumplimiento | Detalle) y devuelve, por sucursal, el
// objetivo más reciente de cada texto distinto.
// targetAnio: filtra las filas MENSUALES a ese año exacto (fila sin Año se
// asume del año actual). Las filas "Anual" (ej. "sensibilización", tipo
// acompanamiento_anual) NUNCA se filtran por año.
function leerObjetivosReales_(targetAnio) {
  var sr;
  try {
    sr = getSheetRows_(['🎯 Objetivos', 'Objetivos']);
  } catch (err) {
    return {};
  }
  var h = sr.header;
  var idxSuc = h.indexOf("Sucursal");
  var idxMes = h.indexOf("Mes");
  var idxAnio = h.indexOf("Año");
  var idxTexto = h.indexOf("Objetivo");
  var idxEstado = h.indexOf("% cumplimiento");
  var idxDet = h.indexOf("Detalle");

  var result = {};    // empId -> texto -> { mesIdx, avance, ok, detalle } (último mes)
  var historial = {}; // empId -> texto -> [{ mesIdx, ok }, ...] (todos los meses, para KPI costo)

  sr.rows.forEach(function (r) {
    var suc = String(r[idxSuc] || "").trim();
    var texto = String(r[idxTexto] || "").trim();
    if (!suc || !texto) return;
    if (/documentos adicionales/i.test(texto)) return; // fila informativa, no es uno de los 4 objetivos reales

    var empId = normalizarSucursal_(suc);
    var mes = normalizarMes_(r[idxMes]); // "Anual" no matchea ningún mes y queda tal cual (mesIdx -1)
    if (mes.toLowerCase() !== "anual") {
      var anioFila = idxAnio === -1 ? "" : String(r[idxAnio] || "").trim();
      if (!anioFila) anioFila = String(new Date().getFullYear());
      if (targetAnio && anioFila !== targetAnio) return;
    }
    var mesIdx = MESES.indexOf(mes);
    var rawEstado = idxEstado === -1 ? "" : r[idxEstado];
    var detalle = idxDet === -1 ? "" : String(r[idxDet] || "").trim();
    var s = String(rawEstado === null || rawEstado === undefined ? "" : rawEstado).trim();

    var avance = null, ok = null;
    if (/^(s[ií]|ok)$/i.test(s)) { avance = 100; ok = true; }
    else if (/^no$/i.test(s)) { avance = 0; ok = false; }
    else {
      var n = normalizePercent_(rawEstado);
      if (n !== null) { avance = n; ok = n >= 100; }
    }

    result[empId] = result[empId] || {};
    var prev = result[empId][texto];
    if (!prev || mesIdx > prev.mesIdx) {
      result[empId][texto] = { mesIdx: mesIdx, avance: avance, ok: ok, detalle: detalle };
    }

    if (mesIdx >= 0 && ok !== null) {
      historial[empId] = historial[empId] || {};
      historial[empId][texto] = historial[empId][texto] || [];
      historial[empId][texto].push({ mesIdx: mesIdx, ok: ok });
    }
  });

  // "Incorporar KPI de costo - valorización", "100% trazabilidad" y
  // "Cumplimiento normativa SINADER": con "último mes gana" (arriba), un
  // mes bueno (ej. Febrero) quedaba tapado por un mes malo posterior (ej.
  // Julio). Para estos 3 objetivos se reemplaza "último mes gana" por el %
  // de meses evaluados que estuvieron 100% completos ese mes — un mes
  // bueno entre varios evaluados ya se refleja como avance, en vez de
  // desaparecer tapado por un mes malo posterior.
  Object.keys(historial).forEach(function (empId) {
    Object.keys(historial[empId]).forEach(function (texto) {
      var esKpiCosto = /kpi.*costo/i.test(texto);
      var esTrazabilidad = /trazabilidad/i.test(texto);
      var esSinader = /sinader/i.test(texto);
      if (!esKpiCosto && !esTrazabilidad && !esSinader) return;

      var meses = historial[empId][texto];
      var totalEval = meses.length;
      var totalOk = meses.filter(function (m) { return m.ok; }).length;
      var mesesOk = meses.filter(function (m) { return m.ok; }).map(function (m) { return MESES[m.mesIdx]; });
      var avance = totalEval > 0 ? Math.round(totalOk / totalEval * 100) : null;

      var detalle;
      if (totalOk === 0) {
        detalle = esKpiCosto ? 'Sin costo ni ingreso registrado en ningún mes evaluado'
          : esSinader ? 'Ningún mes evaluado con 100% de declaraciones SINADER'
          : 'Ningún mes evaluado con 100% de trazabilidad';
      } else {
        var sufijo = esKpiCosto ? 'con costo o ingreso registrado' : 'con 100% completo';
        detalle = totalOk + ' de ' + totalEval + ' meses ' + sufijo + ' (' + mesesOk.join(', ') + ')';
      }

      result[empId] = result[empId] || {};
      result[empId][texto] = {
        mesIdx: meses[meses.length - 1].mesIdx,
        avance: avance,
        ok: avance !== null && avance >= 100,
        detalle: detalle
      };
    });
  });

  return result;
}


// ============================================================
// VISOR DE MINUTAS — lectura/escritura de la pestaña "Minuta". El visor
// detecta solo los bloques de sesión (fila de título en columna A, resto de
// A:F vacío) y manda de vuelta headerRow/dataStartRow/colMap junto con los
// items — el backend no necesita saber la estructura interna de cada minuta.
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


// ── Utilidad para probar desde el editor (Ejecutar → testBuildPayload) ──
function testBuildPayload() {
  var payload = buildPayload_();
  Logger.log(JSON.stringify(payload, null, 2));
}
