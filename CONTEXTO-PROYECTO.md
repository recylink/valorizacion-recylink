# Contexto del proyecto: valorizacion-recylink.html

Este es un archivo HTML standalone (una sola página, sin build) para Recylink, que
permite hacer seguimiento de valorización de residuos y trazabilidad documental para
6 empresas cliente: **Copec**, **Socovesa**, **Abastible**, **Gespania**, **Salfa** y
**Euro**. Sincroniza bidireccionalmente con Google Sheets vía Apps Script.

## Estructura general
- Un solo archivo HTML con `<style>` y `<script>` embebidos (sin frameworks, JS vanilla).
- Selector de empresa arriba (Copec / Socovesa / Abastible / Gespania / Salfa / Euro) que cambia el contexto global.
- 3 pestañas: **Valorización**, **Trazabilidad**, **Objetivos**.
- Cada empresa carga datos desde un Excel de trazabilidad (subido por el usuario) o
  desde el Google Sheet correspondiente (botón "↓ Cargar desde Sheets").
- **IMPORTANTE**: la app NO funciona abierta directamente como `file://` en el navegador
  por restricciones CORS — debe alojarse en un servidor (ej. GitHub Pages) para que el
  fetch a los Apps Script funcione. El usuario aún no la ha subido a GitHub Pages.

## Configuración de empresas (objeto `EMPRESAS` en el JS)

### Copec
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxnmprhhBj6DRKMxze6DU5H8P9CC62MGm0iQgMnzE8f3bA7laxwktefGewQg5lp2o49/exec`
- Sheet ID: `1yHnsIPhYuqvHHyQwyQvRMMOa905qxXvUWfw2p_W8UGo`
- `trazDocsCompletos: ['transp','disp']` — la trazabilidad 100% solo exige transportista + disposición final
- `trazDocsInfo: ['cert','factura','decl']` — documentos informativos que NO afectan el % de trazabilidad, se muestran en fila separada "Documentos adicionales"
- **Excepciones a trazabilidad**: residuos cuyo nombre contiene "orgán"/"organico", y sucursales que empiezan con "CDL", NO se penalizan por falta de transportista/disposición final
- Metas de valorización 2026 por sucursal, editables en la app (botón "✎ Editar metas"), guardadas en `COPEC_METAS_DEFAULT` + localStorage + sync tipo `valorizacion_metas`
- Objetivos: `[{id:'trazabilidad', tipo:'trazabilidad'}]`
- Formato de visualización de Objetivos: tabla con columnas por mes (Ene, Feb...), filas:
  % Valorización real / % Acumulado / Meta 2026 / 100% trazabilidad / Documentos adicionales

### Socovesa
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbx5mKQ873Ob_3Yd4n1kUI5imxEpXO5UzllhMpYGCoIBFHwBKSI9Moct7p9SYuEL9znM/exec`
- Sheet ID: `12CDpG9dNUIKtT5tsKGx8JgekHE0_RyWfEx-pba6zvPM`
- `trazDocsCompletos: ['cert','transp','disp']`
- Sin excepciones especiales de trazabilidad
- 5 objetivos: 100% trazabilidad, Valorizar al menos un residuo (anual), Declarar SINADER,
  Registrar residuos a valorizar (anual), Registrar retiros Respel (anual)
- Sucursal excluida: "Edificio Eliodoro Yañez" (aparece en trazabilidad pero no en valorización/objetivos)
- Formato de visualización: agrupado por sucursal, tabla "Análisis anual" + tabla mensual con
  columnas Objetivo | Mes | Estado | Detalle (función `renderObjetivos` / `makeTableSection`)

### Abastible
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbzGG_DqA-CcJM8VJ6xq4Rai693desNOMAZO-MeYhdkJWFtZwnPnJ4AVV33q56fuyaMX/exec`
- Sheet ID: `1cu3gSJao4wG-UEK5xG6DEWjy8qZF4kEZ8agOQ2Wo3IU`
- `trazDocsCompletos: ['transp','disp']`
- `trazDocsInfo: ['cert','factura','decl']` — se agregó "factura" recientemente
- Sin excepciones especiales de trazabilidad
- Metas de valorización fijas (no editables desde la app): `ABASTIBLE_METAS = {Planta Concón:15, Planta Talca:30, Planta Lenga:30, Planta Osorno:30, Oficina Central:30}`
- 3 objetivos:
  1. `100% trazabilidad` — transportista + disposición final
  2. `Declarar mensualmente en SINADER` — mismo cálculo que Socovesa (excluye donaciones)
  3. `KPI costo e ingreso (ingresos > 0)` — marca OK si algún residuo tiene
     `Total Costo Neto de Transporte > 0` **O** `Precio por Venta de Residuo > 0` (es un OR, no AND)
- Usa el mismo formato de visualización que Copec (tabla por mes), extendido con 2 filas
  adicionales: "Declarar mensualmente en SINADER" y "KPI costo e ingreso"

### Gespania (agregada 2026-07-24)
- Sheet ID: `1628zcLexOnY5sT4S98vOp8vf8fSnc_RdTgBmG6-nLCk`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbwENVSOcXoQalAD2b-INqsFx0hVehfwXwrVqegY_2zj_B7S2t_dFqlo_qH1JeYqr9ER/exec`
  (desplegado 2026-07-24, corriendo `Code-Gespania.gs`)
- Sucursales: "General Jofre Fontana" y "El Rosal lll" (ojo: en la hoja Contactos aparecen
  con variantes de escritura — "Fonatana" en vez de "Fontana" — no se agregó alias porque
  la hoja de Valorización/Objetivos ya usa la forma "Fontana" consistentemente).
  Esta empresa introduce columnas adicionales que las otras 3 no tienen: `Contactos`,
  `Minuta`, `👥 Seguimiento_CSE`, `Pendientes sucursales`, `Config.Flat` — ninguna de esas
  hojas es leída por el visor HTML (`Code-Gespania.gs` solo lee/escribe las 3 hojas
  estándar + Total Residuos + RESPEL, igual que las demás empresas).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (igual
  que Abastible)
- `generaTotalResiduos` incluye a Gespania (`esCopec || esAbastible || esGespania`) porque
  su Sheet ya trae las pestañas `Total Residuos` y `RESPEL` creadas.
- Metas de valorización: **no** son un objeto hardcodeado como Copec/Abastible — se leen
  siempre desde `metasFromSheets` (fila "Meta %" de ♻️ Valorización, 5% fijo todos los
  meses al momento de agregar la empresa). No son editables desde la app.
- 4 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, fila 3, y hardcodeados en
  `EMPRESAS.gespania.objetivos` con el mismo texto exacto para que el matching por nombre
  con la hoja `🎯 Objetivos` funcione):
  1. `100% trazabilidad` — tipo `trazabilidad`, igual cálculo que las demás empresas
  2. `Declarar mensualmente en sinader` — tipo `sinader`, igual cálculo que Abastible/Socovesa
  3. `Lograr un FGR de 0,2 m3/m2` — tipo `manual`: el % de cumplimiento se ingresa a mano
     en la hoja `🎯 Objetivos` del Sheet, la app solo lo muestra (no hay forma de calcular
     FGR — Factor de Generación de Residuos — desde los datos de Trazabilidad_Docs)
  4. `valorizar un 5% de residuos en kg` — tipo `manual` también, por consistencia con FGR
     (es en la práctica equivalente al % Real vs Meta 2026 que ya se muestra en la misma
     tabla, pero se agregó como fila propia porque así está definida en `Objetivos 2026`)
- Se agregó un tipo de objetivo genérico nuevo, `tipo:'manual'`, en `renderCopecObjetivos()`
  (no existía antes) — renderiza una fila por objetivo buscando `objBySucMes` por nombre
  exacto, igual patrón que las filas SINADER/KPI, pero `calcObjetivos()` nunca calcula un
  estado para estos (no hay `else if(obj.tipo==='manual')` en el switch), así que quedan en
  "--" hasta que alguien llene manualmente `% cumplimiento` en la hoja `🎯 Objetivos`.

### Salfa (agregada 2026-07-24)
- Sheet ID: `1LtRSJ-ZYPYoFmGHUik03OAVYxzg9REPn5NTIGhostGI`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbyp5gnnZjhOIpAdTSGn8Nhs0umE_VXbUVTTQLLpjUVRSn2hKy7wFShNUfx_Q8HSI85O/exec`
  (Code-Salfa.gs, mismo patrón que Code-Gespania.gs)
- Sucursales: "Novatec Pucará" e "Inoval Brisas de san pedro" — OJO: son nombres de los
  **contratistas** que operan cada obra (no "Salfa X"), confirmados por el usuario como
  los mismos que trae el Excel a subir, texto exacto.
- **Bug de onboarding encontrado**: en `♻️ Valorización` las 6 filas de datos precargadas
  a mano tenían la columna `empresa_id` (col. A) completamente vacía, y el `readSheet()`
  del Apps Script filtra `r[0] !== ''`, así que `doGet` devolvía `valorizacion: []` pese a
  que el Sheet se veía con datos. Se le pidió al usuario llenar A6:A11 con cualquier texto
  no vacío (ej. "Salfa") como fix inmediato. Al subir el Excel real, la app va a crear filas
  con `empresa_id` propio por sucursal (vía `sucId()`) y las genéricas quedarán huérfanas
  — mismo patrón de limpieza manual que se hizo con Gespania (ver más abajo).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']`
- `generaTotalResiduos` incluye a Salfa (ya trae las pestañas `Total Residuos` y `RESPEL`
  creadas en el Sheet).
- Metas: igual que Gespania, se leen de `metasFromSheets` (no hay objeto hardcodeado ni
  edición desde la app). Al momento de agregar la empresa estaban en 0% para ambas
  sucursales (sin definir aún).
- 4 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, texto exacto):
  1. `100% trazabilidad` — tipo `trazabilidad`, cálculo estándar
  2. `cumplir declaración SINADER` — tipo `sinader`, mismo cálculo que Abastible/Socovesa/Gespania
  3. `KPI Costo ingreso` — tipo `kpi_costo`, mismo cálculo que Abastible (OK si `Total Costo
     Neto de Transporte > 0` O `Precio por Venta de Residuo > 0`)
  4. `Asegurar una correcta segregación de residuos` — **tipo nuevo `segregacion`**, calculado
     (no manual): OK si en ese mes/sucursal aparece algún residuo que **no** sea
     Escombro/Excavación/Domiciliario (comparación normalizada sin tildes vía `normResiduo()`);
     si todos los residuos del mes son de esas 3 categorías genéricas, da "No" (no se está
     segregando). Detalle lista los residuos "extra" encontrados. Implementado en
     `calcObjetivos()` (rama `obj.tipo==='segregacion'`) y renderizado en
     `renderCopecObjetivos()` igual que la fila SINADER/KPI.

### Euro (agregada 2026-07-24)
- Sheet ID: `1au2aa9n0Sh6kYS5TEq28g1nmS_4O9tZFDNaf3j7CQoY`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxfxqFZkptLnyUL0Q-P6GFid_z7KVMNAByM0SxQ5pVjg2DP-t-sW9k87KtWGV1AvbMO/exec`
  (desplegado 2026-07-24, corriendo `Code-Euro.gs`, público desde el primer intento)
- Sucursales (10, de la hoja `Contactos` — no hardcodeadas en el JS, se derivan del
  Excel/Sheet como en las demás empresas): Oficina Central, Proyecto Departamental, Proyecto
  Amengual, Proyecto Santa Elena, Proyecto Entre Vicuñas, Proyecto Mirador Irarrázaval,
  Proyecto Don Pepe II, Proyecto San Pablo Trotter, Proyecto Alto Irarrázaval, Proyecto
  Zañartu (la hoja Contactos trae 4 filas con "Zañartu" a secas y 1 con "Proyecto Zañartu";
  el usuario confirmó que el nombre correcto es **"Proyecto Zañartu"**, así que las filas sin
  el prefijo en Contactos están mal escritas — no se tocó esa hoja, no la usa el visor).
- **Excepción única: % de valorización por VOLUMEN (m3), no por peso (kg)**. Se agregó
  `esEuro` en `processData()` y una variable `metricaVal = esEuro ? m3 : kg` que reemplaza
  `kg` en la acumulación de `valMatrix[suc][mes].total/val` — todas las demás empresas
  siguen usando kg sin cambios. `Total Residuos` sigue trackeando ambos (kg y m3) como
  siempre, no se tocó.
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']`
- `generaTotalResiduos` incluye a Euro (Sheet ya trae `Total Residuos` y `RESPEL`).
- Metas: igual que Gespania/Salfa, vía `metasFromSheets` (Sheet no traía filas de Meta%
  precargadas al momento de agregar la empresa — `♻️ Valorización` estaba completamente vacía).
- 7 objetivos definidos en la hoja `Objetivos 2026` (8 líneas en el Sheet, pero "5% de
  valorización en volumen" NO se agregó como fila de objetivo propia — ya queda cubierto por
  las filas genéricas % Real/Meta 2026/% Acumulado, ahora en base m3 para esta empresa):
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar
  2. `Valorizar fierro, madera, cartón` — **tipo nuevo `valorizar_especificos`** (anual):
     progreso acumulado = (N° de esos 3 residuos valorizados al menos una vez en el año) / 3.
     Ej. si solo se valorizó Cartón → 33%; si además Madera → 66%; los 3 → 100%. Config del
     objetivo incluye `residuos:['Fierro','Madera','Cartón']` (comparación normalizada sin
     tildes vía `normResiduo()`). Implementado en `calcObjetivos()` dentro del bloque de
     objetivos anuales (agregado a `OBJ_ANUALES`), se renderiza solo porque la tabla "Análisis
     anual" de `renderCopecObjetivos()` ya es genérica para cualquier tipo en `OBJ_ANUALES`.
  3. `FGR igual o menor a 0,2` — tipo `manual`
  4. `Ton CO2 evitadas/M2` — tipo `manual`
  5. `Contactar Nuevos proveedores` — tipo `manual`
  6. `Acompañamiento en terreno, mediante charlas y una auditoría` — tipo `manual`
  7. `Costo/Presupuesto` — tipo `manual`
- Las hojas `Seguimiento_CSE` y `Config.Flat` de este Sheet traen datos de OTRAS empresas
  (ANDO, Copec, Daikin, etc.) — el Sheet se clonó de una plantilla compartida y no se limpió.
  No afecta al visor (no lee esas hojas), es solo cosmético; queda a criterio del usuario
  limpiarlo.

### Ando (agregada 2026-07-27)
- Sheet ID: `1r4TtS9Gtrd83oZse8yABCHRg4V1lxgxoW6a3YCxbpk0`
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxDXNb5jL5CsJDEUy71c8fARsoXB3ZzuEBs4Z9zEa7ZQhLBgvuDcWmUNAOa_VIxdTg/exec`
  (desplegado 2026-07-27, corriendo `Code-Ando.gs`).
- Sucursales: solo **ETB** (única fila en `Contactos` y en `♻️ Valorización`).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (igual
  que Copec/Euro/Salfa/Gespania).
- `trazCols` NO incluye `Transportista (nombre)` (Ando no trae esa columna en su Sheet, a
  diferencia de Abastible/Socovesa). La hoja `📊 Trazabilidad_Docs` real de Ando tiene una
  columna extra al final, `Comentario por sucursal`, que no está en `trazCols` — como
  `writeTrazabilidad` borra y reinserta la fila completa en cada sync, cualquier comentario
  manual en esa columna se pierde al sincronizar. No se resolvió (ninguna otra empresa tiene
  este patrón); si el usuario necesita conservarlo habría que agregar lógica especial a
  `writeTrazabilidad` de Ando para no borrar esa columna.
- Metas de valorización: vía `metasFromSheets` (no hardcodeadas) — el Sheet ya trae `Meta %`
  = 5% fijo en todos los meses para ETB, consistente con el objetivo "Valorizar un 5% de
  residuos en peso".
- `generaTotalResiduos` incluye a Ando — el Sheet ya trae las pestañas `Total Residuos`
  (7 columnas: `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel |
  Total KG | Total M3`, `Code-Ando.gs` con `numCols = 7`) y `RESPEL` (ya completa, ~64
  residuos mapeados). Ando **no** usa `Año` ni `Tons. CO2eq. evitadas` — ambas son
  exclusivas de Euro/del grupo original respectivamente (decisión del usuario, 2026-07-27,
  ver sección "Total Residuos + RESPEL" arriba), así que no hace falta agregar esos 2
  headers al Sheet de Ando.
- 5 objetivos (definidos en la hoja `Objetivos 2026` del Sheet, texto exacto):
  1. `100% trazabilidad` — tipo `trazabilidad`, cálculo estándar
  2. `Cumplimiento normativa SINADER` — tipo `sinader`, mismo cálculo que Abastible/Socovesa/etc.
  3. `Generar sensibilización, concientización y cultura ambiental` — tipo `manual` (no hay
     forma de calcular esto desde los datos de trazabilidad, se ingresa a mano en `🎯 Objetivos`)
  4. `Valorizar un 5% de residuos en peso` — tipo `manual`, agregado por consistencia con la
     hoja `Objetivos 2026` aunque en la práctica duplica el % Real/Meta 2026 ya mostrado
     (mismo patrón que Gespania/Euro)
  5. `Incorporar KPI de costo - valorización` — tipo `kpi_costo`, mismo cálculo que
     Abastible/Salfa (OK si `Total Costo Neto de Transporte > 0` O `Precio por Venta de
     Residuo > 0`)
- La hoja `🎯 Objetivos` de Ando ya trae ~150 filas con `100% trazabilidad`/`Documentos
  adicionales` calculados pero con `empresa_id`/`Sucursal`/`Mes` **vacíos** en todas —
  parecen venir de otro sistema (el "Portal de Trazabilidad" general de Recylink, no de este
  visor) y `readSheet()` del Apps Script las descarta (`r[0]!==''`), así que no afectan a la
  app. La hoja `Empresas_Config` también trae filas de otras empresas del portal general
  (Gespania, CTEC, Novatec, Obra Limpia, etc., con `meta_val` distinto al de esta app) —
  igual que `Seguimiento_CSE`/`Config.Flat` de Euro, es una plantilla compartida y no la lee
  el visor HTML.

### PMS (agregada 2026-07-30)
- Sheet ID: `1q1T543MVj9eA4bjbaysIRpr3eGf0fB_J5B1PekGBo6A` (título "PMS" en Drive, creado
  2026-07-30 — clon vacío de la plantilla "Portal de Trazabilidad", igual punto de partida
  que tuvieron Euro/Ando/Salfa/Gespania).
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxebFCdrIRxJVPzE3Rdo5hf_CZT9cpqIbszqQalGRTMa3v2aRedgwFTDfwkpWioXs9_/exec`
  (desplegado 2026-07-30, corriendo `Code-PMS.gs`, verificado con `doGet` — responde
  `{valorizacion:[],trazabilidad:[],objetivos:[],respel:[...]}`, vacío salvo `respel` que ya
  trae la lista completa de residuos del Sheet clonado).
- Sucursales: **sin definir aún** — la hoja `Contactos` del Sheet está vacía; se derivarán
  automáticamente del Excel de trazabilidad que suba el usuario (mismo patrón que Euro/Ando/
  Salfa/Gespania, no hardcodeadas en el JS).
- `trazCols` igual que Ando (sin `Transportista (nombre)`, el Sheet clonado no trae esa
  columna separada — coincide exactamente con el header real de `📊 Trazabilidad_Docs` del
  Sheet de PMS).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (patrón
  estándar, igual que Copec/Abastible/Gespania/Salfa/Euro/Ando).
- Objetivos: **decisión del usuario 2026-07-30** — se usan tal cual los 2 objetivos genéricos
  que ya trae la pestaña `Objetivos 2026` del Sheet clonado ("100% trazabilidad" y "20%
  Valorización"), sin objetivos específicos propios por ahora. Igual que Copec,
  `EMPRESAS.pms.objetivos` solo tiene `{id:'trazabilidad', tipo:'trazabilidad'}` — el "20%
  Valorización" no es una fila de objetivo separada, queda cubierto por las filas genéricas
  % Real/Meta 2026/% Acumulado que ya se muestran en la tabla (mismo criterio usado con Euro
  para "5% de valorización en volumen").
- Metas de valorización: **meta fija de 20% hardcodeada** (`PMS_META_PCT` + `getPmsMetas()`,
  agregado 2026-07-30) — a diferencia de Gespania/Salfa/Euro/Ando, el Sheet de PMS nunca tuvo
  una fila "Meta %" precargada a mano, así que el patrón `metasFromSheets` (leer lo que ya
  está en el Sheet) no tenía nada que leer y la meta nunca se sincronizaba. `getPmsMetas()`
  genera dinámicamente `{sucursal: 20}` para todas las sucursales actuales (las de PMS no
  están hardcodeadas de antemano), mismo patrón de "meta fija en código" que Abastible pero
  calculado en runtime. Se usa en `autoSync()` (`metasActuales`) y en `renderCopecObjetivos()`
  (`metas`).
- `generaTotalResiduos` incluye a PMS (`esPms` en `processData()`) — el Sheet clonado ya trae
  las pestañas `Total Residuos` (7 columnas, sin `Tons. CO2eq. evitadas` ni `Año` — igual que
  Ando) y `RESPEL` (ya poblada con la lista estándar de residuos, igual que Ando). `Code-PMS.gs`
  usa `numCols = 7` en `writeTotalResiduos`, mismo patrón que `Code-Ando.gs`.
- **Bug de onboarding encontrado y corregido (2026-07-30)**: al agregar PMS solo se actualizó
  la lista de empresas en `processData()` (`generaTotalResiduos`), pero quedaron 2 listas
  hardcodeadas más sin `'pms'`: la de `metasActuales` y la de `filasTotalResiduos` dentro de
  `autoSync()`, y la de `metas` en `renderCopecObjetivos()`. Resultado: "Total Residuos" nunca
  se sincronizaba (el payload quedaba vacío, nunca se mandaba el POST) y la fila "Meta %"
  tampoco. Corregido agregando `'pms'`/`empresaActual==='pms'` a las 3 listas restantes.
- **Excepción de trazabilidad para operaciones de 0 kg (agregada 2026-07-30, solo PMS)**: en
  todas las demás empresas, una operación con `Control de Peso (Kg) === 0` se descarta por
  completo para efectos de trazabilidad (`if (kg === 0) return;` en `processData()`, no
  incrementa `Importaciones` ni cuenta documentos). Para PMS, a pedido del usuario, estas
  operaciones **sí** cuentan como aporte a la trazabilidad (incrementan `Importaciones`), pero
  sin exigir transportista ni disposición final — se implementó igual que la excepción de
  Donaciones ya existente (`donEnG`): cada grupo `trazMap[key]` ahora trackea `impCeroKg`
  (cuántas de sus operaciones fueron de 0 kg), y en `calcObjetivos()` (cálculo de "100%
  trazabilidad") ese conteo se suma al lado del documento exigido en la comparación
  `(r[d]+donEnG+impCeroKg) >= r.imp` para `transp`/`disp` — mismo mecanismo de "sumar al
  numerador" en vez de excluir la fila entera, para no afectar operaciones no-cero del mismo
  residuo/mes/sucursal que sí deben cumplir. Como `emp.trazDocsCompletos` de PMS es
  exactamente `['transp','disp']`, esta excepción cubre el 100% de los documentos exigidos
  para PMS. Gateado con `empresaActual==='pms'` en `calcObjetivos()`, sin efecto en las demás
  empresas (su `impCeroKg` queda siempre en 0).
- **"Producto Circular" agregado a `VALORIZADOS_LIST` (2026-07-30, cambio global, no exclusivo
  de PMS)**: Humus (Vivero Leliantú) aparecía como "No Valorizado" en `Total Residuos` porque
  su `Tipo de Tratamiento` en el Excel de PMS es literalmente "Producto Circular", un valor
  que no estaba en la lista de tratamientos que cuentan como valorización (`isValorizado()`).
  Se agregó tal cual (comparación exacta tras normalizar tildes/mayúsculas, igual que el resto
  de la lista). Como `VALORIZADOS_LIST` no está segmentada por empresa, si otra empresa usa
  esa misma etiqueta también contará como valorizado — consistente con el propósito de la
  lista (no se acotó a PMS a propósito).
- **"Recuperación energética" agregado a `VALORIZADOS_LIST` (2026-07-30, cambio global)**:
  detectado al investigar por qué NPR - Embotelladora Renca (CCU) caía a 65,1%/49,7% de
  valorización en marzo/junio — el residuo "Ril de azúcar liquida" (77.290 kg en marzo,
  178.270 kg en junio, volúmenes grandes que dominan el total mensual por ser ponderado por
  kg) tenía `Tipo de Tratamiento = "Recuperación energética"`, no cubierto por la lista.
  Confirmado por el usuario como un tratamiento valorizable. Se agregó (junto a su variante
  sin tilde, aunque `isValorizado()` ya normaliza tildes/mayúsculas antes de comparar, mismo
  patrón redundante que ya existía para "Reutilizacion"/"Reutilización").

### CCU (agregada 2026-07-30)
- Sheet ID: `1gChzhAy3wiXWAPr17OW4RypGMqY76dYRHLuK2wwvKR8` (título "CCU" en Drive, creado
  2026-07-30 — clon vacío de la plantilla "Portal de Trazabilidad", igual punto de partida
  que PMS/Euro/Ando/Salfa/Gespania). La pestaña `Objetivos 2026` de este Sheet en particular
  no traía el texto genérico de plantilla — tenía pegado por error un borrador de correo sin
  relación, así que no se usó como referencia (a diferencia de PMS, donde sí se reutilizó el
  texto genérico).
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbxZIqb5W8o0GWZqWIrG5s1Qg0R54Ij15U7MiT-GzgUmXjaYSCx10nTVu-h5W6mLDvj6/exec`
  (desplegado 2026-07-30, corriendo `Code-CCU.gs`, verificado con `doGet` — responde
  `{valorizacion:[],trazabilidad:[],objetivos:[],respel:[...]}`, vacío salvo `respel`).
- Sucursales: **2 con meta confirmada por el usuario 2026-07-30, texto exacto tal como viene
  en el Excel** — "NPR - Embotelladora Renca" y "CirCCUlar". A diferencia de PMS/Euro/Ando
  (donde las sucursales se derivan del Excel sin hardcodear), aquí sí se hardcodeó la meta por
  sucursal (ver `CCU_METAS` abajo) porque el usuario ya conocía de antemano el nombre exacto y
  la meta. **El Excel real subido trajo una 3ra sucursal, "NPR - Obra Nave 2 Planta Renca"**,
  sin meta definida — no está en `CCU_METAS`, así que por diseño (`metasActuales[suc] !==
  undefined`) simplemente no se le sincroniza fila "Meta %" ni se le muestra meta en Objetivos;
  el resto (trazabilidad, % Real/Acumulado) funciona igual para ella. Pendiente confirmar con
  el usuario si necesita meta propia.
- **"NPR - Obra Nave 2 Planta Renca" agregada a `SUCURSALES_EXCLUIDAS` (2026-07-30)**: el
  usuario confirmó que esa sucursal está cerrada — debe verse en Trazabilidad (histórico) pero
  no en Valorización ni Objetivos, mismo criterio que "Edificio Eliodoro Yañez" de Socovesa.
  Al revisar el mecanismo existente se encontró que estaba **incompleto**: `isSucExcluida()`
  solo se usaba para poblar el selector `f-obj-suc` (Objetivos) — no filtraba nada cuando se
  elegía "Todas", ni tocaba en absoluto la pestaña Valorización (selector `f-suc`, gráfico, ni
  el % global agregado). Es decir, para Socovesa la sucursal excluida seguía siendo
  visible en Valorización y en Objetivos con "Todas" seleccionado — documentado antes como
  "no aparece en valorización/objetivos" pero en realidad solo estaba oculta del dropdown de
  selección individual de Objetivos. Corregido para las 6 empresas de una vez: `renderVal()`
  (lista a mostrar + agregado global de kg/% + contador "Sucursales"), `renderChart()`, y
  `renderCopecObjetivos()` (rama `fS==='all'`) ahora filtran con `isSucExcluida()`; los
  `populateSel('f-suc', ...)` (2 call sites, `processData()`/`loadSheetsData()`) también.
  `f-traz-suc`/trazabilidad se dejó sin tocar a propósito (debe seguir mostrando todo,
  incluidas sucursales cerradas).
- `trazCols` igual que PMS/Ando (sin `Transportista (nombre)`, coincide con el header real del
  Sheet clonado).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (patrón
  estándar).
- Objetivos: **caso nuevo — mismos 3 objetivos para ambas sucursales, pero con meta de
  valorización distinta por sucursal** (no objetivos *distintos* por sucursal; la app no
  soporta eso hoy, solo listas de objetivos uniformes por empresa):
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar.
  2. `Tener KPI Costo - Ingreso` — tipo `kpi_costo`, mismo cálculo que Abastible/Salfa/Ando (OK
     si `Total Costo Neto de Transporte > 0` **O** `Precio por Venta de Residuo > 0`).
  3. `Gestionar Residuos Spot` — **tipo `manual`** (decisión del usuario 2026-07-30: no hay un
     dato identificable en el Excel para calcularlo automáticamente, se ingresa a mano el "%
     cumplimiento" en la hoja `🎯 Objetivos` del Sheet, igual patrón que FGR/CO2/otros
     objetivos manuales de Euro/Gespania/Ando).
- Metas de valorización: **`CCU_METAS` hardcodeado** (nueva constante, junto a
  `ABASTIBLE_METAS`/`COPEC_METAS_DEFAULT`) — `{'NPR - Embotelladora Renca': 96, 'CirCCUlar':
  60}`. Usado directamente (no vía `metasFromSheets` ni una función dinámica como
  `getPmsMetas()`) porque, a diferencia de PMS, las sucursales y sus metas ya se conocían de
  antemano.
- `generaTotalResiduos` incluye a CCU (`esCcu` en `processData()`) — mismo patrón que
  Ando/PMS: el Sheet clonado ya trae las pestañas `Total Residuos` (7 columnas, sin `Tons.
  CO2eq. evitadas` ni `Año`) y `RESPEL`. `Code-CCU.gs` usa `numCols = 7` en
  `writeTotalResiduos`.
- **Lección aplicada de PMS**: se agregó `'ccu'`/`empresaActual==='ccu'` a las 3 listas
  hardcodeadas de empresas en un solo paso (`generaTotalResiduos` en `processData()`,
  `metasActuales`+`filasTotalResiduos` en `autoSync()`, y `metas` en
  `renderCopecObjetivos()`) para no repetir el bug de "Total Residuos nunca sincroniza" que
  pasó al agregar PMS (ver sección de bugs arriba).

### Acciona (agregada 2026-07-31)
- Sheet ID: `1t89jBSO8bQ7XXhh-CYQ2bs9cC-Ph-WVv9kbCCvEBqAk` (título "Acciona" en Drive, creado
  2026-07-31 — clon vacío de la plantilla "Portal de Trazabilidad", igual punto de partida
  que PMS/CCU/Euro/Ando/Salfa/Gespania).
- `scriptUrl`: `https://script.google.com/macros/s/AKfycbz8gVOfQIf77WRLMbhdJ8ZkcI3LbIPzenh91k42npKetDOXax8Dx54V4UZm98KahiiV/exec`
  (desplegado 2026-07-31, corriendo `Code-Acciona.gs`, aún no verificado con `doGet` real —
  ver pendiente abajo).
- Sucursales: **sin definir aún** — la hoja `Contactos` del Sheet está vacía; se derivarán
  automáticamente del Excel de trazabilidad que suba el usuario (mismo patrón que
  Euro/Ando/Salfa/Gespania/PMS/CCU, no hardcodeadas en el JS).
- `trazCols` igual que Ando/PMS/CCU (sin `Transportista (nombre)`, coincide con el header
  real de `📊 Trazabilidad_Docs` del Sheet clonado). Ese header además trae una columna extra
  al final, `Comentario por sucursal`, que no está en `trazCols` — mismo quirk exacto que
  Ando (`writeTrazabilidad` borra y reinserta la fila completa en cada sync, así que un
  comentario manual en esa columna se pierde al sincronizar; no se resolvió, mismo criterio
  que Ando).
- `trazDocsCompletos: ['transp','disp']`, `trazDocsInfo: ['cert','factura','decl']` (patrón
  estándar).
- La pestaña `Objetivos 2026` del Sheet clonado ya traía 4 objetivos con texto específico de
  Acciona (no el genérico de plantilla) al momento de crear la empresa — se usaron tal cual:
  1. `100% trazabilidad` — tipo `trazabilidad`, estándar.
  2. `Superar el 40% de valorización de residuos (sin considerar escombro, arena y
     excavación)` — **no** se agregó como fila de objetivo propia en `EMPRESAS.acciona.objetivos`
     (decisión del usuario 2026-07-31, mismo criterio usado con Euro/PMS: ya queda cubierto
     por las filas genéricas % Real/% Acumulado/Meta 2026 que muestra la tabla de Objetivos
     para cualquier empresa). Lo que sí cambió es el cálculo del propio %: en `processData()`
     se agregó `esEscombroArena = esAcciona && (residuo==='escombro'||residuo==='arena')`
     (comparación normalizada sin tildes vía `normResiduo()`), sumado a `excluirDeVal` junto
     a la exclusión de Excavación ya existente para todas las empresas. **Solo para Acciona**
     (decisión del usuario 2026-07-31, igual patrón que la exclusión de Respel que es
     exclusiva de Copec) — Escombro/Arena siguen contando normalmente para las demás 8
     empresas. Esta exclusión es solo del %valorización, no de trazabilidad (Escombro/Arena
     sí exigen sus documentos normales, a diferencia de Excavación que también se excluye de
     trazabilidad).
  3. `Segregación de residuos (Madera, pallet, vidrio, fierro, PET, RESPEL, plumavit, PVC,
     Film Stretch)` — reutiliza el tipo `valorizar_especificos` que ya existía para Euro
     ("Valorizar fierro, madera, cartón"), sin cambios de código: es genérico para cualquier
     lista de N residuos (`obj.residuos`), calcula % anual = (residuos de la lista valorizados
     al menos una vez en el año) / N. Config: `residuos:['Madera','Pallet','Vidrio','Fierro',
     'PET','RESPEL','Plumavit','PVC','Film Stretch']` (9 ítems, decisión del usuario
     2026-07-31 sobre cómo calcular este objetivo automáticamente — comparación normalizada
     sin tildes, igual que Euro).
  4. `Apoyar en obtención de puntos para certificación CES en temas de innovación y economía
     circular` — tipo `manual` (confirmado por el usuario 2026-07-31): no hay dato en el
     Excel de trazabilidad que permita calcularlo, se ingresa a mano el "% cumplimiento" en
     la hoja `🎯 Objetivos` del Sheet, mismo patrón que FGR/CO2/otros objetivos manuales de
     Euro/Gespania/Ando/CCU.
- Metas de valorización: **editables por sucursal desde la app** (decisión del usuario
  2026-07-31), mismo patrón que Copec — `getAccionaMetas()`/`saveAccionaMetas()`
  (localStorage key `acciona_metas`) calcadas de `getCopecMetas()`/`saveCopecMetas()`. Se
  agregó un pequeño dispatcher (`getMetasEditablesActuales()`/`saveMetasEditablesActuales()`/
  `metaDefaultEditable()`) para que `openMetasEditor()` y su handler de guardado (antes
  hardcodeados a Copec) sirvan a cualquiera de las 2 empresas con metas editables sin
  duplicar esas ~30 líneas. El botón "✎ Editar metas" y la fila "Meta 2026" en la tabla
  agrupada de Valorización ahora se muestran para `empresaActual==='copec'||'acciona'` en
  vez de solo Copec (3 call sites de visibilidad del botón + 1 de la fila).
  - **Bug encontrado y corregido (2026-07-31)**: al agregar Acciona, `ACCIONA_METAS_DEFAULT`
    se dejó como objeto vacío `{}` (a diferencia de `COPEC_METAS_DEFAULT`, que ya trae valores
    por sucursal conocida) porque las sucursales de Acciona no se conocían de antemano.
    Resultado: tras subir el Excel real, la fila "Meta %" nunca se sincronizaba a la hoja
    `♻️ Valorización` (el usuario reportó "falta la meta de valorización en el excel") — mismo
    mecanismo de `autoSync()` que omite la fila si `metasActuales[suc]` es `undefined` (ver
    bug #8 de la lista general), y como no había ningún default, siempre era `undefined` hasta
    que alguien abriera "Editar metas" a mano. Corregido reemplazando la constante estática por
    `getAccionaMetasDefault()` (función, mismo patrón que `getPmsMetas()`): genera
    dinámicamente `{sucursal: 40}` para todas las `sucursales` actuales (`ACCIONA_META_PCT_DEFAULT
    = 40`, tomado del objetivo "Superar el 40% de valorización..."). `getAccionaMetas()` ahora
    mergea `getAccionaMetasDefault()` (en vez de la constante vacía) + `metasFromSheets` +
    `localStorage`, así que el 40% se sincroniza automáticamente apenas se sube el Excel, sin
    perder la posibilidad de editar el valor por sucursal desde la app (lo guardado en
    localStorage sigue prevaleciendo sobre el default).
- `generaTotalResiduos` incluye a Acciona (`esAcciona` en `processData()`) — el Sheet
  clonado ya trae las pestañas `Total Residuos` (7 columnas, sin `Tons. CO2eq. evitadas` ni
  `Año` — igual que Ando/PMS/CCU) y `RESPEL` (lista estándar). `Code-Acciona.gs` usa
  `numCols = 7` en `writeTotalResiduos`, mismo patrón que `Code-Ando.gs`/`Code-PMS.gs`/
  `Code-CCU.gs`.
- **Lección aplicada de PMS/CCU**: se agregó `'acciona'`/`empresaActual==='acciona'` a las
  3 listas hardcodeadas de empresas en un solo paso (`generaTotalResiduos` en
  `processData()`, `metasActuales`+`filasTotalResiduos` en `autoSync()`, y `metas` en
  `renderCopecObjetivos()`), más el `valMetas` de `renderVal()` (propio de las empresas con
  metas editables), para no repetir el bug de "Total Residuos nunca sincroniza".
- **Excepción de trazabilidad para Madera (agregada 2026-07-31, solo Acciona)**: a pedido
  del usuario, la Madera no exige el documento "Disposición final" para contar como completa
  en "100% trazabilidad" — pero sí sigue exigiendo Transportista (a diferencia de la
  excepción de CDL/Orgánicos, que excluye ambos). Implementado en `calcObjetivos()`
  (rama `obj.tipo==='trazabilidad'`) con una variable nueva `excluirSoloDisp =
  empresaActual==='acciona' && normResiduo(r.residuo)==='madera'` y un set
  `docsExcSoloDisp={disp:1}`, chequeados junto a (pero por separado de) la excepción
  existente `excluirTranspDisp`/`docsExcEspecial` de CDL/Orgánicos, en los 3 lugares que
  recorren `trazSM` (cálculo del %, detalle "✓ residuos completos", y detalle de
  documentos faltantes).

## Apps Script (estructura común a las 3 empresas originales; Gespania, Salfa, Euro y Ando siguen el mismo esquema)
Cada empresa tiene su propio Google Sheet con 3 hojas, headers en fila 5, datos desde fila 6:
- `♻️ Valorización` — columnas: `empresa_id | Sucursal | Tipo | Enero...Diciembre` (Tipo = "% Real" o "Meta %")
- `📊 Trazabilidad_Docs` — columnas: `empresa_id | Sucursal | Mes | Residuo | Transportista(nombre) | Código LER | Importaciones | Cert. tratamiento | Factura | Cert. declaración | Transportista | Disposición final`
- `🎯 Objetivos` — columnas: `empresa_id | Sucursal | Mes | Objetivo | % cumplimiento | Detalle`

Funciones del Apps Script (`doPost`, `doGet`):
- `writeValorizacion` — borra filas por `empresa_id` coincidente, inserta nuevas
- `writeMetas` — actualiza SOLO las filas "Meta %" in situ (no toca "% Real"), para que
  editar metas desde la app no borre los datos reales
- `writeTrazabilidad` — dedup por `empresa_id + Residuo` (columna índice 2)
- `writeObjetivos` — **IMPORTANTE**: para Socovesa se corrigió para borrar solo por
  `empresa_id + mes` (no por prefijo completo), para no perder histórico al cargar Excel
  de meses distintos. Verificar que Copec/Abastible también tengan esta lógica correcta.
- `doGet` — devuelve `{valorizacion, trazabilidad, objetivos}` como arrays de objetos,
  usando los headers de fila 5 como claves.

## Lógica clave del JS (funciones principales)

- `isValorizado(trat)` — determina si un tipo de tratamiento cuenta como valorización.
  Normaliza Unicode (NFD, quita tildes) antes de comparar contra `VALORIZADOS_LIST`.
- `processData()` (regla agregada 2026-07-24, aplica a las 5 empresas): una operación del
  Excel con `Control de Peso (Kg) === 0` NO se considera para efectos de trazabilidad — no
  incrementa `Importaciones` ni los conteos de documentos, así que no entra en el cálculo de
  `100% trazabilidad` ni en "Documentos adicionales" (y de rebote tampoco en KPI costo/ingreso,
  que se calcula desde el mismo grupo). SÍ sigue sumando a `valMatrix` (% valorización) y a
  `Total Residuos`, porque el pedido fue específicamente "para efectos de trazabilidad".
- `calcObjetivos()` — función central que calcula TODOS los objetivos (trazabilidad,
  sinader, kpi_costo, anuales) para todas las sucursales/meses desde `rawRows` (datos del Excel).
  Devuelve array de `{suc, mes, mesKey, obj, estado, detalle, anual, infoOnly}`.
- `estadoCell(estado, detalle)` — helper que renderiza una celda de estado con color
  (verde/amarillo/rojo según objColor) + mini barra de progreso + detalle HTML debajo.
- `objColor(estado)` — verde ≥100%, amarillo ≥60%, rojo <60%; "OK" verde, "No" rojo.
- `getPct(suc, mes)` / `getAcum(suc, mes)` — calculan % de valorización mensual/acumulado
  desde `valMatrix`. Manejan el caso `fromSheets:true` donde el valor ya viene como %
  directo (no como kg/total).
- `renderCopecObjetivos()` — renderiza la tabla de objetivos en formato "columnas por mes"
  (usado por Copec y Abastible). Lee de `calcObjetivos()` si hay Excel cargado, o de
  `sheetsObjetivosData` si los datos vienen del Sheet.
- `renderObjetivos()` / `makeTableSection()` — renderiza formato "filas por objetivo+mes"
  (usado por Socovesa).
- `loadSheetsData(data)` — procesa la respuesta del `doGet` y puebla `valMatrix`, `trazRows`,
  `sucursales`, `mesesDisp`. Tiene protecciones null (`if (!row) return`) porque el Sheet
  puede traer filas vacías o con formato inconsistente.
- `resetData()` — limpia todo el estado visual e interno al cambiar de empresa.

## Bugs resueltos importantes (para no repetirlos)
1. Template literals anidados rompían el parser → todo el JS usa concatenación de strings, no ES6 template literals con backticks anidados.
2. El operador `||` trata `0` como falso — esto causó bugs donde `estado = 0` (0%) se leía
   como string vacío. Se corrigió comparando explícitamente contra `undefined`/`null`/`''`.
3. Porcentajes del Sheet vienen en 3 formatos posibles: decimal 0-1 (`0.05` = 5%), string
   con % (`"5.2%"`), o coma decimal (`"0,00%"`). Hay que detectar el formato antes de convertir.
4. `Object.keys(valMatrix[suc])` fallaba cuando una sucursal solo existía en trazabilidad
   pero no en valorización (ej. Edificio Eliodoro Yañez en Socovesa) → siempre verificar
   `if (!valMatrix[suc]) return` antes de iterar.
5. Sucursales duplicadas en el Sheet por cambios de nombre entre cargas (ej. "Olimpia III"
   → "Parque Olimpia III - Socovesa sur") requieren limpieza manual del Sheet + alias en `SUC_ALIAS`.
6. La app solo funciona sirviéndose por HTTP (no `file://`) por CORS — pendiente subir a GitHub Pages.
7. **Race condition al cambiar de empresa rápido** (encontrado y corregido 2026-07-27, reportado
   por el usuario con Ando: `Error: Unexpected token '<'... no es JSON válido`, y por separado
   sucursales de Copec mezcladas con las de Ando). `loadSheetsData()` capturaba
   `empresaAlCargar = empresaActual` **dentro** de su propio callback (que corre síncronamente
   dentro del `.then()` del fetch), así que la comparación de guarda al final siempre se
   comparaba contra sí misma y nunca bloqueaba nada — si el usuario cambiaba de empresa
   mientras un `fetch` anterior (ej. el auto-load de Copec al abrir la página) seguía en
   vuelo, esa respuesta tardía igual mutaba `sucursales`/`mesesDisp`/`valMatrix`/los
   `<select>` de la empresa que ya no estaba activa. Arreglado capturando
   `empresaAlIniciar = empresaActual` en `loadFromSheets()` **antes** de lanzar el `fetch`, y
   chequeando `empresaActual !== empresaAlIniciar` al inicio de los callbacks `.then()`/`.catch()`
   (no al final de `loadSheetsData()`) — si la empresa activa cambió, la respuesta tardía se
   descarta por completo, sin tocar ningún estado global.
8. **`writeValorizacion` borraba la fila "Meta %" al subir un Excel** (encontrado 2026-07-27,
   con Ando/Terminal Bus: la Meta % de 5% quedó vacía tras subir el Excel). Causa: `autoSync()`
   siempre reenvía las 3 filas (% Real/% Acumulado/Meta %) por sucursal, pero si `metasFromSheets`
   todavía no se cargó (ej. se sube el Excel antes de que "Cargar desde Sheets" —disparado al
   seleccionar la empresa— termine de resolver), `metasActuales[suc]` es `undefined` y se
   reenviaba una `Meta %` vacía. Como `writeValorizacion` en el Apps Script borraba TODAS las
   filas que compartieran `empresa_id` (sin filtrar por `Tipo`), el reenvío de solo 2 filas
   (% Real/% Acumulado) igual borraba la Meta % existente y la dejaba vacía. Arreglado en 2
   partes: (a) `autoSync()` ahora omite la fila `Meta %` por completo cuando `metasActuales[suc]`
   es `undefined`, en vez de mandarla vacía; (b) `writeValorizacion` (los 6 `.gs`) ahora borra por
   `empresa_id+Tipo` (mismo patrón que `writeTrazabilidad`/`writeObjetivos`), no solo por
   `empresa_id`, así que omitir una fila realmente la deja intacta en el Sheet en vez de
   borrarla. **Pendiente:** redesplegar el `.gs` actualizado en las 6 empresas — los que ya
   estaban en producción (Copec/Abastible/Socovesa/Gespania/Salfa/Euro/Ando) siguen con la
   versión vieja y vulnerable hasta que se repegue el código. Mientras tanto, si a alguna
   sucursal se le borró la Meta %, hay que volver a escribirla a mano en el Sheet.

## Total Residuos + RESPEL (Copec y Abastible desde 2026-07-24)
El Sheet de Copec tiene 2 hojas adicionales a las 3 comunes, exclusivas de Copec:
- `Total Residuos` — headers: `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas`
  (Copec/Abastible/Gespania/Salfa/Euro) — Euro además tiene una columna `Año` extra en la
  posición B (`Sucursal | Año | Mes | ...`), exclusiva de esa empresa (ver más abajo). Una
  fila por combinación única Sucursal+Mes+Residuo+Valorizado/No Valorizado+Respel/No Respel
  (un mismo residuo puede generar 2 filas en un mes si tuvo operaciones valorizadas y no valorizadas).
  Se llena automáticamente desde el Excel de trazabilidad (`processData()` en el JS), igual que
  ♻️ Valorización y 📊 Trazabilidad_Docs — no se llena a mano.

**Tons. CO2eq. evitadas** (agregada 2026-07-27): última columna, no se calcula — viene
directamente del Excel de trazabilidad en la columna `Tons. CO2eq. evitadas` (ya expresada en
toneladas por el sistema origen — el nombre de columna real del Excel no coincidía con lo que
leía el código, `Ton CO2 eq evitadas`, corregido el 2026-07-27 tras confirmarlo con el usuario).
`processData()` la suma por `trKey` igual que kg/m3 (mismo agrupamiento por
Sucursal+Mes+Residuo+Valorizado+Respel). Aplica a Copec, Abastible, Gespania, Salfa y Euro —
**no** a Ando (agregada después, ver sección "Ando" más abajo), `writeTotalResiduos` de esas 5
sigue con `numCols = 8`.

**Año** (agregada 2026-07-27, **exclusiva de Euro** — decisión tomada el mismo día tras
confirmar con el usuario que no aplica a las demás empresas): columna 2 (B) solo en el Sheet
de Euro, calculada en `autoSync()` como `r.mes.slice(0,4)` (el `mes` interno sigue siendo
`"YYYY-MM"`, solo se toma la parte del año) y solo cuando `empresaActual==='euro'` (variable
`generaAnioTR` en `autoSync()`). Motivada porque el Sheet de Euro ya traía esta columna
agregada a mano en su pestaña `Total Residuos` pero quedaba siempre vacía. `Code-Euro.gs` es
el único de los 5/6 `.gs` con `numCols = 9`; los demás (Copec/Abastible/Gespania/Salfa) quedan
en `numCols = 8` (con CO2eq, sin Año) y Ando en `numCols = 7` (sin ninguna de las 2).
- `RESPEL` — headers: `Residuo | RESPEL` (TRUE/FALSE), ~55 residuos mapeados. Fuente de verdad para
  clasificar qué residuos son Respel. Se lee vía `doGet` y se cachea en `respelSet` (JS). Si `respelSet`
  está vacío (Sheet aún no cargado), `isRespel()` cae a un fallback por nombre (substring "respel").

**Abastible también genera "Total Residuos"** (agregado 2026-07-24): el JS usa la variable
`generaTotalResiduos = esCopec || esAbastible` para decidir si arma `totalResiduosRows` y sincroniza
la hoja `Total Residuos`. Abastible NO tiene hoja `RESPEL` propia — `isRespel()` usa el fallback por
nombre (substring "respel"), que ya clasifica correctamente porque Abastible tiene un residuo llamado
literalmente "RESPEL" en sus datos. El Sheet de Abastible necesita la pestaña `Total Residuos` creada
manualmente (mismos headers que Copec) y su Apps Script necesita el parche en
`Code-Abastible-patch.gs` (raíz del repo) para soportar `tipo:'totalResiduos'` en `doPost`.

**Cálculo de %Real/%Acumulado**: para Copec excluye SIEMPRE los residuos Respel (decisión tomada
2026-07-22): `processData()` construye `valMatrix` sumando kg solo de filas no-Respel (variable
`excluirDeVal = esCopec && respel`), así que `getPct`/`getAcum` ya excluyen Respel sin cambios propios.
**Para Abastible NO se excluye Respel del %** (decisión tomada 2026-07-24 al extender "Total Residuos"
a Abastible) — el % sigue incluyendo todos los residuos, solo cambia que ahora también se puebla la
hoja "Total Residuos" con la clasificación Valorizado/Respel por fila.
`autoSync()` también escribe una fila `% Acumulado` en ♻️ Valorización (antes solo se escribía `% Real`
y `Meta %`; la fila `% Acumulado` ya existía vacía en el Sheet pero nada la llenaba).

**Excavación excluida del % de valorización en TODAS las empresas** (decisión tomada 2026-07-24):
en `processData()`, `excluirDeVal` ahora también es `true` cuando `normResiduo(residuo) === 'excavacion'`
(comparación normalizada, sin tildes), sin importar la empresa — a diferencia de la exclusión de Respel
que es solo para Copec. Las operaciones de Excavación no suman ni al total ni al valorizado de
`valMatrix`, así que no afectan `% Real`/`% Acumulado` de ninguna sucursal. Sigue sumando normalmente
a `Total Residuos` (no se tocó esa parte).

**Excavación excluida también de trazabilidad en TODAS las empresas** (corregido 2026-07-28):
la exclusión de 2026-07-24 de arriba solo tocaba `valMatrix` (% valorización) — `trazMap` (la
estructura que alimenta `trazRows`, y por lo tanto "100% trazabilidad"/"Documentos adicionales"/
SINADER/KPI costo en `calcObjetivos()`) seguía contando las operaciones de Excavación como
cualquier otra. Se agregó `if (esExcavacion) return;` justo después del filtro por Estado
finalizado en `processData()` (antes del filtro de `kg === 0`), reutilizando la misma variable
`esExcavacion` ya calculada para el % de valorización. Sigue sumando normalmente a
`Total Residuos` (ese bloque corre antes de este `return` y no se tocó).

**Apps Script pendiente de agregar manualmente** (no hay acceso de edición directa al proyecto
de Apps Script desde aquí — vive en Google, no en este repo). El Code.gs real de Copec tiene
DOS doGet fusionados: `doGetClasico_` (el que consume `valorizacion-recylink.html`, sin query
params) y `doGetVisor_` (otro desarrollo distinto, activado por `?callback=`/`?visor=1` — no tocar).
Falta agregar en `doGetClasico_`/`doPost`:
1. `doGetClasico_` debe agregar `respel: readRespelSheet_()` al objeto `result` que devuelve
   (hoy solo devuelve `{valorizacion, trazabilidad, objetivos}`).
2. `doPost` debe agregar el caso `tipo === 'totalResiduos'` → `writeTotalResiduos(ss, data)`.
3. Ni "Total Residuos" ni "RESPEL" tienen las filas decorativas de título que sí tienen las 3
   hojas principales (headers en fila 5) — el header está en una fila distinta, por eso las
   funciones nuevas ubican el header buscando "Sucursal"/"Residuo" en columna A en vez de asumir
   fila fija.
- Código completo y listo para copiar/pegar (Code.gs fusionado con estos 3 cambios ya
  integrados) en `Code.gs` en la raíz del repo.

## "Contactar Nuevos proveedores" pasó a ser objetivo anual (agregado 2026-08-19)
El usuario ya venía ingresando este objetivo (`tipo:'manual'`, definido para renderizarse en la
tabla mensual) como una fila **"Anual"** en 🎯 Objetivos — no calzaba con ningún mes de la tabla
mensual ni con la tabla "Análisis anual" (que solo itera objetivos cuyo `tipo` está en
`OBJ_ANUALES`), así que no se veía en ningún lado pese a tener datos reales cargados.

- Se agregó un tipo nuevo **`manual_anual`** (genérico, sin cálculo — puramente para que un
  objetivo de ingreso manual se renderice en "Análisis anual" en vez de la tabla mensual) y se
  agregó a `OBJ_ANUALES`. `proveedores` (Euro) ahora usa este tipo.
- El push de resultados anuales en `calcObjetivos()` ahora tiene un gate `if(estado)` (antes
  incondicional) — necesario porque `manual_anual` nunca asigna `estado` (no hay cálculo, se lee
  tal cual desde el Sheet), y sin el gate se mandaría un estado vacío en cada sincronización,
  borrando el valor ya ingresado a mano (mismo problema ya corregido antes para los manuales
  mensuales). Los demás tipos anuales existentes (`valorizar_residuo`, `reg_valorizar`, `respel`,
  `valorizar_especificos`, `acompanamiento_anual`) siempre asignan un estado no vacío, así que
  este gate no les cambia el comportamiento.
- **Aviso al usuario sobre mayúsculas**: escribió "Ok" (no "OK") en la columna `% cumplimiento` —
  el sistema compara ese valor exacto (`estado==='OK'`) para pintarlo verde y contarlo como
  cumplido en el resumen de la sucursal; con "Ok" se sigue mostrando (cae al color por defecto),
  pero no cuenta como "cumplido" en el conteo agregado. Se le recomendó usar "OK" en mayúsculas
  para los próximos objetivos manuales tipo OK/No.

## "Ton CO2 evitadas/M2" ahora también se muestra en el visor (agregado 2026-08-19)
Cambio de decisión del usuario: originalmente "Ton CO2 evitadas/M2" quedaba solo escrito en
`%avance`, sin tocar el visor. Ahora también se muestra ahí, pero puramente informativo (sin
barra de cumplimiento ni color, ya que no tiene meta) — mismo patrón visual que "Documentos
adicionales" de Copec/Abastible (`estado:''` + `detalle` con el texto, `infoOnly:true`).
Implementado en `calcObjetivos()`: nueva rama `obj.tipo==='manual' && empresaActual==='euro' &&
obj.id==='co2'` que arma el `detalle` desde `fgrCo2EuroCalc` (mismo dato ya calculado para FGR),
con un `results.push` aparte del gate normal `if(estado)` (que de por sí no dispararía, ya que
esta rama nunca asigna `estado`) — mismo mecanismo que usa Copec para su fila extra de
"Documentos adicionales". El valor se formatea con `toSigFigs(valor, 5)` (5 cifras
significativas, agregado el mismo día a pedido del usuario).

## "Acompañamiento en terreno" pasó a ser objetivo anual (agregado 2026-08-19)
A pedido del usuario: este objetivo (antes calculado mes a mes, tipo `manual`) pasó a ser
**anual** — se agregó un tipo nuevo `acompanamiento_anual` (distinto de `manual`, ya que
`manual` es compartido por otros objetivos no relacionados que no deben volverse anuales), se
agregó a `OBJ_ANUALES`, y se le agregó su propia rama en el bloque de objetivos anuales de
`calcObjetivos()` (junto a `valorizar_residuo`/`reg_valorizar`/`respel`/`valorizar_especificos`):
`estado='OK'` si hubo al menos una "Visita a terreno" (SI) en el año (respetando el `anio` que
se le pase a `calcObjetivos()`, igual que los demás objetivos anuales), `detalle` = lista de los
meses exactos en que se realizó la visita (ej. "Mayo, Julio"). Se renderiza solo en la tabla
"Análisis anual" existente (genérica para cualquier tipo en `OBJ_ANUALES`, sin cambios de UI).

- Se sacó la rama mensual que se le había agregado antes (`tipo==='manual' &&
  obj.id==='acompanamiento'`) y el push manual correspondiente en `autoSync()` — al ser ahora
  parte de `OBJ_ANUALES`, `calcObjetivos()` ya lo incluye como resultado anual, y el
  `filasObj = calcObjetivos().map(...)` que ya existía en `autoSync()` lo sincroniza solo
  (mismo mecanismo que respel/valorizar_residuo, sin código extra).

## FGR/Acompañamiento no se veían en el visor recién subido el Excel (corregido 2026-08-19)
Bug encontrado al probar: el cálculo de FGR/CO2ev/m2 y Acompañamiento en terreno se agregó
primero solo en `autoSync()` (lo que sí sincroniza bien hacia el Sheet), pero **no** en
`calcObjetivos()` — la función que calcula qué se muestra en pantalla justo después de subir un
Excel (antes de volver a leer desde Sheets). Como el `switch` de tipos de objetivo en
`calcObjetivos()` no tenía ninguna rama para `tipo:'manual'`, el visor seguía mostrando "--" para
FGR/Acompañamiento inmediatamente después de subir el Excel, aunque el Sheet ya tuviera el valor
correcto (síntoma reportado por el usuario: "se ve en el Excel pero no en el visor").

- Se agregaron 2 ramas nuevas en `calcObjetivos()` (rama mensual, identificadas por
  `obj.tipo==='manual' && empresaActual==='euro' && obj.id==='fgr'/'acompanamiento'`, ya que
  `tipo:'manual'` es compartido por varios objetivos no relacionados en distintas empresas — se
  distingue por `id` además de `tipo`), reusando exactamente la misma fórmula que `autoSync()`.
- `fgrCo2EuroCalc = calcFgrCo2Euro()` ahora se calcula **una sola vez** antes del loop de
  sucursales de `calcObjetivos()` (no una vez por cada combinación suc×mes×objetivo), para no
  recalcular innecesariamente.
- **Limitación conocida**: el loop mensual de `calcObjetivos()` solo evalúa objetivos para
  combinaciones Sucursal+Mes que tengan al menos una fila en el Excel ese mes (`rowsSM.length`).
  Si una obra tiene % Avance/Visita a terreno cargado para un mes sin ninguna operación de
  trazabilidad ese mes, FGR/Acompañamiento no se mostrarían para ese mes en el render "recién
  subido" (sí se sincronizarían igual a través de `autoSync()`/`% de avance`/🎯 Objetivos, y se
  verían correctamente al usar "Cargar desde Sheets" después). No reportado como problema real
  todavía, se deja documentado por si aparece.

## Objetivo "Acompañamiento en terreno" automatizado en Euro (agregado 2026-08-19)
Mismo día que el fix de FGR/CO2ev/m2: el usuario ya tenía una hoja `👥 Seguimiento_CSE` con
estructura propia (header en la fila donde columna A dice `empresa_id`, sin fila fija —
el usuario mencionó fila 3, pero se ubica dinámicamente con `buscarFilaEncabezado_`, igual que
Total Residuos/RESPEL — más robusto si se inserta una fila arriba a futuro): una fila por
Sucursal + `Acción CSE` (`Correo seguimiento` / `Reunión seguimiento` / `Visita a terreno`), con
SI/NO por mes (headers de mes en Title Case: "Abril", "Mayo"... — sin columna Año, a diferencia
de `% de avance`). Regla del usuario: si "Visita a terreno" es SI ese mes, el objetivo
**"Acompañamiento en terreno, mediante charlas y una auditoría"** (antes `tipo:'manual'`) se está
cumpliendo.

- `Code-Euro.gs`: nueva `readCseSheet_()`, expuesta como `cse` en `doGet`.
- `valorizacion-recylink.html`: nuevo global `euroCse` (`{suc: {mesKey: {correo, reunion,
  visita}}}`), poblado en `loadSheetsData()` desde `data.cse`. **Sin columna Año en esta hoja** —
  se asume `new Date().getFullYear()` (mismo criterio ya usado en el resto del sistema para
  hojas sin esa columna; limitación conocida si algún día hay datos de más de un año en esta
  hoja).
- En `autoSync()` (mismo bloque `if (empresaActual === 'euro')` que arma FGR/CO2): por cada
  Sucursal+Mes con dato de "Visita a terreno" (SI u NO explícito), agrega una fila a `filasObj`
  para el objetivo `acompanamiento` con `% cumplimiento` = 100% (SI) o 0% (NO). Si no hay dato ese
  mes, no manda nada — no pisa lo que ya haya en 🎯 Objetivos (reutiliza el `writeObjetivos` ya
  corregido por empresa_id+mes+Objetivo).
- **No requiere crear ninguna hoja nueva** — `👥 Seguimiento_CSE` ya existía en el Sheet de Euro
  (se ve en la sección "Bugs..." más arriba, listada entre las hojas con datos de otras empresas
  por venir de plantilla clonada — esta automatización sí la usa activamente ahora).
- **Pendiente del usuario**: pegar el `Code-Euro.gs` actualizado (mismo archivo que ya incluye el
  fix de FGR/CO2ev/m2) y redesplegar.

## Cálculo automático de FGR y CO2ev/m2 en Euro (agregado 2026-08-19)
**Nombre real de la pestaña: `%avance`** (sin espacios) — el usuario la describió como "% de
avance" en la conversación, pero el nombre literal de la hoja es distinto. Bug encontrado 2026-08-19
al probar: `readAvanceSheet_()`/`writeAvance()` buscaban `ss.getSheetByName('% de avance')` y no
encontraban la hoja (devolvían `{m2Totales:{}, filas:[]}` en silencio, sin error — confirmado
inspeccionando `euroAvance`/`calcFgrCo2Euro()` vía consola del navegador, ambos vacíos). Corregido
buscando `ss.getSheetByName('%avance') || ss.getSheetByName('% de avance')` en ambas funciones,
mismo patrón de fallback por nombre que ya usan las demás hojas de este archivo. El resto de esta
sección usa "`% de avance`" como referencia narrativa, pero el nombre real de la pestaña en el
Sheet es `%avance`.

El usuario creó una hoja nueva `% de avance` en el Sheet de Euro para ingresar a mano el % de
avance de construcción de cada obra (acumulado, ej. 28% → 36% → 56%). Combinado con el m2 total
de cada obra (que también conoce), puede derivar m2 construidos, y con eso calcular FGR (m3
generados / m2 construidos) y Ton CO2 evitadas/m2 — cálculo que hacía a mano. Se automatizó
completo.

**Formato de la hoja `% de avance`** (distinto a las 3 hojas estándar, sin filas decorativas):
- Fila 1: `Sucursal` | nombre de cada obra, una por columna (ej. "Proyecto Departamental").
- Fila 2: `m2 totales` | el m2 total de esa obra, alineado con la fila 1.
- Fila 3: vacía.
- Fila 4: headers `empresa_id | Sucursal | Tipo | Año | MAYO | JUNIO | ... | DICIEMBRE` (el rango
  de meses del header puede no empezar en Enero — se lee dinámicamente, no se asume fijo).
- Fila 5+: 3 filas por obra — `% Avance` (ingreso manual, se deja intacto), `FGR` y `CO2ev/m2`
  (antes vacías, ahora las llena el visor automáticamente en cada sincronización).

**Decisiones de cálculo (confirmadas por el usuario 2026-08-19)**:
- FGR y CO2ev/m2 se calculan con m3/CO2 **acumulados desde el inicio de la obra** hasta ese mes
  (no solo el mes puntual) — consistente con que el % Avance también es acumulado.
- **Excavación se excluye** del m3/CO2 usado (mismo criterio que ya excluye Excavación del %
  de valorización en todas las empresas). Para el m3, esto ya viene gratis: `valMatrix` de Euro
  ya excluye Excavación (`excluirDeVal`), así que `calcFgrCo2Euro()` solo filtra Excavación
  manualmente para el CO2 (que viene de `totalResiduosRows`, que sí incluye Excavación).
- El objetivo **"FGR igual o menor a 0,2"** (antes `tipo:'manual'`, ingreso a mano en 🎯
  Objetivos) ahora se auto-completa: `% cumplimiento = min(100, 0,2/FGR × 100)` — proporcional,
  no binario (si el FGR es el doble de la meta, marca 50%, no 0%).
- El objetivo **"Ton CO2 evitadas/M2"** queda solo informativo — no tiene meta definida, no se
  toca en 🎯 Objetivos, solo se escribe el valor calculado en `% de avance`.

**Implementación**:
- `valorizacion-recylink.html`: nuevo global `euroAvance` (`m2Totales` + `pctPorSucMes`),
  poblado en `loadSheetsData()` desde `data.avance` (nuevo campo del `doGet`). Nueva función
  `calcFgrCo2Euro()` que devuelve `{suc: {mesKey: {fgr, co2m2}}}`. En `autoSync()`, para Euro:
  construye `filasAvance` (payload `{tipo:'avance', filas:[...]}`, un objeto por fila con
  `valores` indexado por **nombre de mes** en vez de por posición — evita que el cliente tenga
  que adivinar el rango exacto de columnas del header) y agrega filas extra a `filasObj` para el
  % cumplimiento del objetivo FGR (reutiliza el `writeObjetivos` ya corregido por
  empresa_id+mes+Objetivo, así que solo actualiza esa fila sin tocar las demás).
- `Code-Euro.gs`: `readAvanceSheet_()` (lee filas 1-2 para `m2Totales`, filas 4+ para los datos)
  expuesto como `avance` en `doGet`. `writeAvance()` (nuevo caso en `doPost`) actualiza in-place
  las filas `FGR`/`CO2ev/m2` por `Sucursal+Tipo+Año`, escribiendo cada mes por nombre de columna
  (busca el header en la hoja real) — nunca toca las filas `% Avance`, el cliente nunca envía ese
  tipo.
- **Pendiente del usuario**: pegar el `Code-Euro.gs` actualizado en el Apps Script real y
  redesplegar (nueva versión, misma URL) para que el cálculo se sincronice de verdad.

## writeObjetivos borraba filas manuales de otros objetivos (corregido 2026-08-14)
Encontrado al agregar el objetivo FGR de Socovesa: `writeObjetivos` borraba las filas existentes
que coincidieran en `empresa_id+Mes`, sin considerar cuál era el `Objetivo` de esa fila. Como los
objetivos `tipo:'manual'` (FGR, CO2, CES, Residuos Spot, etc.) nunca se recalculan ni se re-envían
en `autoSync()` (`calcObjetivos()` nunca les asigna un `estado`, así que no entran en `filasObj`),
sincronizar CUALQUIER otro objetivo (trazabilidad, sinader, kpi_costo...) para la misma
Sucursal+Mes borraba de paso la fila manual ya ingresada a mano en el Sheet, sin que nada la
reemplazara — quedaba perdida hasta que alguien la escribiera de nuevo.

- **Fix**: la clave de borrado ahora es `empresa_id+Mes+Objetivo` (agregando el texto exacto del
  objetivo a la comparación), en vez de solo `empresa_id+Mes`. Así solo se borra la fila que
  realmente se está reemplazando por la sincronización, sin arrastrar las demás filas de esa
  misma sucursal+mes.
- Aplicado en los 5 `.gs` de este repo con objetivos manuales: `Code-Euro.gs`,
  `Code-Gespania.gs`, `Code-Ando.gs`, `Code-Acciona.gs`, `Code-CCU.gs`. **Euro es distinto**: por
  la columna `Año` extra (columna D), el texto del Objetivo queda en el índice 4 del arreglo
  (`f[4]`), no en el 3 como las demás — la función lee 5 columnas y compara
  `empresa_id+Mes+Objetivo` usando ese índice corrido.
- **Socovesa** (fuera del repo): se le pasó al usuario la función `writeObjetivos` corregida para
  pegar directamente en su Apps Script real (mismo patrón que las demás, sin columna Año).
- No se tocó Copec/Abastible/PMS/Salfa — hoy no tienen ningún objetivo `tipo:'manual'`, así que
  el bug no tiene efecto observable ahí (decisión de alcance del usuario: aplicar solo donde ya
  hay objetivos manuales).

## Objetivo FGR agregado a Socovesa (agregado 2026-08-14)
A pedido del usuario: Socovesa no tenía ningún objetivo de FGR configurado (a diferencia de
Euro/Gespania/Acciona, que ya usaban el patrón `tipo:'manual'` para esto). Se agregó
`{id:'fgr', nombre:'Obtener el FGR al finalizar cada proyecto', tipo:'manual'}` a
`EMPRESAS.socovesa.objetivos`, mismo patrón exacto que el resto de objetivos `manual`: no se
calcula desde el Excel (no hay forma de derivar el FGR — Factor de Generación de Residuos — de
los datos de trazabilidad), el usuario ingresa el "% cumplimiento" a mano en la hoja
`🎯 Objetivos` del Sheet de Socovesa (fila con `Objetivo` = ese texto exacto) cuando el dato esté
disponible (al finalizar cada obra). Hasta que se llene, se muestra "--" en el visor, igual que
los demás objetivos manuales.

## SINADER no exige declaración para residuos de 0 kg (agregado 2026-08-14)
Encontrado al investigar un reporte del usuario con Socovesa. La exclusión de "0 kg no cuenta
para efectos de trazabilidad" (agregada 2026-07-24, ver más abajo) solo se aplicó a `trazMap`
(la agrupación que alimenta trazabilidad/KPI costo), pero el cálculo del objetivo `sinader` en
`calcObjetivos()` usa un array separado (`rowsSM`, filas crudas del Excel filtradas por
Sucursal+Mes desde `rowsFin`) que nunca tenía esta exclusión — así que una operación de 0 kg sí
exigía declaración SINADER, inconsistente con el resto del sistema.

- Se agregó `if((parseFloat(r['Control de Peso (Kg)'])||0) === 0) return false;` como primer
  filtro en `rowsSinDon` (rama `obj.tipo==='sinader'` de `calcObjetivos()`), junto a las
  exclusiones ya existentes (Donaciones, Respel de Abastible, Oficina Central de Abastible).
- **Decisión del usuario 2026-08-14**: aplica a las 4 empresas con objetivo `sinader` (Socovesa,
  Abastible, Gespania, Ando), no solo a Socovesa — mismo criterio de "0 kg no cuenta" ya usado
  de forma transversal para trazabilidad.
- El texto de detalle de residuos excluidos (antes "excluida(s) por donación/Respel") ahora dice
  "excluida(s) por donación/Respel/0 kg" para reflejar el nuevo motivo de exclusión.

## Costo e Ingreso por residuo (agregado 2026-08-07)
Nueva hoja de sincronización, mismo patrón que "Total Residuos": una pestaña adicional en el
Sheet, `Costo e Ingreso`, con una fila por Sucursal+Mes+Residuo mostrando el costo de
transporte y el ingreso por venta acumulados. Pedido explícito del usuario para poder hacer
seguimiento del KPI costo-ingreso (objetivo `tipo:'kpi_costo'`) desde el propio Sheet, no solo
desde el resumen agregado que ya mostraba la tarjeta de Objetivos.

- **Solo para empresas con el objetivo `kpi_costo`** — hoy Abastible, Salfa, Ando y CCU. A
  diferencia de `generaTotalResiduos` (lista de nombres de empresa hardcodeada, que ya causó el
  bug de PMS de "se olvidó agregar la empresa nueva a la lista"), `generaCostoIngreso` en
  `processData()` se deriva de `(emp.objetivos||[]).some(o => o.tipo==='kpi_costo')` — si en el
  futuro se agrega este objetivo a otra empresa, la hoja se sincroniza automáticamente sin
  tocar código.
- Reutiliza `trazMap` (la misma agrupación Sucursal+Mes+Residuo que ya alimenta trazabilidad/
  SINADER/KPI costo en `calcObjetivos()`), agregando 2 acumuladores nuevos al grupo:
  `ingresoTotal` (suma de `Precio por Venta de Residuo`, antes solo se contaba `tieneIngreso`
  como cantidad de operaciones con ingreso > 0, sin sumar el monto) y `kgTotal` (suma de
  `Control de Peso (Kg)`, para poder calcular $/kg si se quiere). Como `trazMap` solo acumula
  filas que pasan los mismos filtros que el KPI (estado finalizado, excluye Excavación, excluye
  0 kg salvo PMS), los totales de esta hoja calzan exactamente con el "Costo neto" que ya
  muestra el detalle de la tarjeta "KPI costo e ingreso".
- **`costoTotal` ahora suma 2 columnas del Excel** (agregado 2026-08-07, a pedido del usuario):
  `Total Costo Neto de Transporte` **+** `Costo de Tratamiento` (nombre exacto de columna
  confirmado por el usuario). Antes solo sumaba la de transporte. Este cambio afecta por igual
  a la hoja "Costo e Ingreso" y al "Costo neto" mostrado en el detalle de la tarjeta "KPI costo
  e ingreso" (comparten el mismo acumulador `g.costoTotal` de `trazMap`), así que ambos
  lugares quedan consistentes sin tocar 2 veces la misma lógica.
- `costoIngresoRows` (nuevo estado global, junto a `totalResiduosRows`) se construye en
  `processData()` solo si `generaCostoIngreso`, y se envía en `autoSync()` como
  `filasCostoIngreso` (payload `{tipo:'costoIngreso', filas:[...]}`), después de `totalResiduos`
  en la cadena de `sendPayload`. Columnas: `Sucursal | Mes | Residuo | Total KG | Costo Total |
  Ingreso Total | Neto (Ingreso - Costo)`.
- Apps Script: nueva función `writeCostoIngreso(ss, data)` en `Code-Abastible.gs`,
  `Code-Salfa.gs`, `Code-Ando.gs` y `Code-CCU.gs` (los 4 `.gs` de empresas con `kpi_costo`),
  copiada del mismo patrón que `writeTotalResiduos` (reemplazo total de las filas de datos,
  ubica el header buscando "Sucursal" en columna A con `buscarFilaEncabezado_`, sin borrado
  selectivo por `empresa_id` porque esta hoja no tiene esa columna). Nuevo caso
  `tipo === 'costoIngreso'` agregado a `doPost` de los 4 archivos. No se lee de vuelta en
  `doGet` (igual que "Total Residuos": es una hoja de solo-sincronización, para revisión manual
  en el Sheet, no la consume el visor HTML).
- **Pendiente manual del usuario (los 4 Sheets)**: crear la pestaña `Costo e Ingreso` en los
  Sheets de Abastible, Salfa, Ando y CCU, con headers exactos `Sucursal | Mes | Residuo | Total
  KG | Costo Total | Ingreso Total | Neto (Ingreso - Costo)` (en cualquier fila, igual que "Total
  Residuos" — no hace falta que sea la fila 5), y pegar el `.gs` actualizado correspondiente en
  el Apps Script real de cada una de las 4 empresas.

## Selector de Año en el visor de Objetivos (agregado 2026-07-27)
Antes de este cambio, `mesesDisp` mezclaba `"YYYY-MM"` de todos los años presentes en el Excel
cargado sin distinguirlos, así que si un Excel tenía datos de 2 años, el % Acumulado (`getAcum()`)
y los objetivos anuales de "Análisis anual" (`calcObjetivos()`, bloque `OBJ_ANUALES`) sumaban ambos
años juntos — bug notado en el Sheet de Euro, donde `Total Residuos` mostraba meses (Julio,
Agosto...) sin año que los distinguiera.

- Nuevo `<select id="f-obj-anio">` en la pestaña Objetivos (junto a `f-obj-suc`/`f-obj-mes`), sin
  opción "Todos" — siempre hay un año concreto seleccionado (el más reciente por defecto).
- `refreshObjMesOptions()` (nueva función, junto a `populateSel`) repuebla `f-obj-mes` con solo los
  meses del año activo cada vez que cambia `f-obj-anio`, para que los 2 selects nunca queden
  contradictorios (año elegido vs. mes de otro año).
- `calcObjetivos(anio)` ahora acepta un año opcional: si viene, filtra `rowsFin` (y por lo tanto los
  objetivos anuales `valorizar_residuo/reg_valorizar/respel/valorizar_especificos`) a solo ese año.
  El bloque mensual no necesitó cambios porque ya itera por `mes` exacto y el renderer filtra las
  columnas a mostrar.
- `getAcum(suc, upTo, anio)` ahora acepta un tercer parámetro opcional: si viene, acota la suma
  acumulada a los meses de ese año (y no usa el atajo `acumFromSheets`, que no está acotado por
  año). Sin `anio`, el comportamiento es idéntico al de antes — los demás call sites (`renderVal`,
  `renderChart`, payloads de sync) no se tocaron a propósito, el pedido era solo para el visor de
  Objetivos.
- `renderCopecObjetivos()` (el único renderer de Objetivos realmente usado, para las 6 empresas —
  `renderObjetivos()` y `renderObjetivosFromSheets()` son código muerto, nunca se llaman) usa
  `mesesAnio = mesesDisp.filter(m => m.slice(0,4)===fA)` en vez de `mesesDisp` para las columnas de
  la tabla mensual, el acumulado del encabezado y el % global (trazabilidad+valorización) por
  sucursal.
- **Limitación conocida** (parcialmente resuelta para Euro el 2026-07-28, ver sección siguiente):
  en el modo "Cargar desde Sheets" (sin Excel cargado), las hojas `♻️ Valorización`/`🎯 Objetivos`
  de Copec/Abastible/Socovesa/Gespania/Salfa/Ando no guardan el año — el código reconstruye
  `mesKey` asumiendo siempre `new Date().getFullYear()`. Ahí el selector de Año solo mostrará una
  opción (el año actual), sin regresión respecto al comportamiento previo. Arreglarlo de fondo
  para esas 6 empresas requeriría el mismo cambio que se hizo para Euro (agregar columna Año +
  tocar `doGet`/`writeObjetivos`/`writeValorizacion`) — no se hizo, fuera de alcance salvo que se
  pida explícitamente.

## Año en Valorización y Objetivos de Euro (agregado 2026-07-28)
El usuario agregó a mano una columna `Año` en `🎯 Objetivos` (columna D, entre Mes y Objetivo) y
trató de meter el año en el encabezado de `♻️ Valorización` escribiendo algo como "Julio - 2024"
en las celdas de mes. Esto último **rompió la lectura**: Google Sheets convirtió ese texto en una
fecha real, y el Apps Script devuelve esas celdas como objetos Date estringificados
(`"Mon Jul 01 2024 03:00:00 GMT-0400 (hora estándar de Chile)"`), que no calzan con ningún nombre
de mes (`Enero`..`Diciembre`) que busca el código — toda la lectura de `% Real`/`% Acumulado`/
`Meta %` de Euro quedaba en null. No había datos reales todavía bajo esos encabezados, así que no
se perdió información al plantear el fix.

**Diseño adoptado (igual patrón que Objetivos/Total Residuos): columna Año + una fila por año**,
en vez de un encabezado con un mes-año distinto por columna:
- `♻️ Valorización` de Euro debe quedar: `empresa_id | Sucursal | Tipo | Año | Enero | Febrero |
  ... | Diciembre` (16 columnas). Por cada sucursal y cada año con datos, 3 filas (% Real/
  % Acumulado/Meta %) con solo esos 12 meses — no un encabezado gigante de 34 columnas.
- **Pendiente manual del usuario en el Sheet**: en la pestaña `♻️ Valorización`, seleccionar la
  fila de encabezados (fila 5) y las celdas de mes, Formato > Número > **Texto sin formato**, y
  volver a escribir solo `Enero`, `Febrero`, ... `Diciembre` (12 columnas, sin año) — borrando las
  ~34 columnas de fecha generadas por error. Luego insertar una columna `Año` nueva entre `Tipo` y
  `Enero`.
- `autoSync()` en el JS: para Euro (`esEuroVal`), en vez de una fila por Tipo cubriendo todo
  `mesesDisp`, genera `aniosDisp = Array.from(new Set(mesesDisp.map(m=>m.slice(0,4))))` y por cada
  año una fila `[id,suc,'% Real',anio,...12 meses]` (y lo mismo para `% Acumulado`/`Meta %`). Las
  otras 6 empresas no cambian.
- **% Acumulado en Valorización SÍ arrastra años anteriores** (decisión tomada 2026-07-28, a
  pedido explícito del usuario — distinto del selector de Año del visor de Objetivos, que
  intencionalmente NO arrastra). Por eso la fila `% Acumulado` de `autoSync()` llama
  `getAcum(suc,mKey)` **sin** el 3er argumento `anio` (a diferencia de `% Real`, que sí usa
  `mKey` con año — pero `% Real` no es acumulativo, cada mes es independiente). El parámetro
  `anio` de `getAcum()` (agregado 2026-07-27) sigue existiendo y se sigue usando tal cual en
  `renderCopecObjetivos()` para el selector de Año — solo se dejó de usar en este único call
  site de `autoSync()`.
- **Bug encontrado y corregido en `getAcum()`** (2026-07-28): con el modo "Cargar desde Sheets",
  cuando se pasaba `anio` (selector de Año en Objetivos), la función ignoraba por completo
  `acumFromSheets` (el valor real ya calculado y guardado en el Sheet) y siempre recalculaba un
  promedio simple de `% Real` mensual — mucho menos preciso, y con Euro (que no es kg-weighted
  en su origen) daba números muy distintos (ej. Proyecto Departamental Junio 2026: Sheet decía
  5,3%, la app mostraba 1,4% = promedio de Ene-Jun sin peso). Se corrigió sacando la condición
  `!anio` del `if` — como `acumFromSheets[suc][upTo]` ya está indexado por mesKey `"YYYY-MM"`
  (año incluido en la key), es siempre correcto usarlo si existe, se haya pasado `anio` o no. El
  recálculo manual sigue como fallback solo para cuando no hay valor de Sheets (datos recién
  subidos desde Excel).
- `filasObj` en `autoSync()`: para Euro, inserta `r.mesKey.slice(0,4)` (o `''` para las filas
  anuales) como 4to elemento, calzando con la columna Año que el usuario ya agregó en D. No
  requiere cambios en `Code-Euro.gs` (`writeObjetivos` es agnóstico al largo de la fila).
- Lectura (`loadSheetsData()` y el fallback `sheetsObjetivosData` de `renderCopecObjetivos()`):
  ahora usan `row['Año'] || new Date().getFullYear()` en vez de asumir siempre el año actual — este
  cambio es general (no exclusivo de Euro), así que si en el futuro se agrega la columna Año a
  otra empresa, la lectura ya la va a aprovechar automáticamente sin tocar código de nuevo.
- **Año también en `📊 Trazabilidad_Docs` de Euro** (agregado 2026-07-28), columna D (entre Mes
  y Residuo — desplaza Residuo/Cod. LER/etc. una posición a la derecha). A diferencia de
  Valorización/Objetivos, esto NO se maneja a través de `emp.trazCols` (que también gobierna la
  tabla que se ve en la pestaña Trazabilidad de la app) — se hizo aparte en `autoSync()`
  (variable `esEuroTraz`) para no agregar esa columna a la tabla visible, mismo criterio que las
  otras 2 hojas: Año es solo para sincronización. `writeTrazabilidad` en `Code-Euro.gs` no
  necesitó cambios: sigue borrando por `empresa_id+Mes` (índices 0 y 2 de la fila), y esos 2
  índices no se movieron al insertar Año en el índice 3. La lectura (`loadSheetsData()`, bloque
  de trazabilidad) también usa `row['Año'] || new Date().getFullYear()` ahora, mismo patrón
  general que Valorización/Objetivos.

- [ ] **PMS**: cargar el Excel de trazabilidad real para derivar sucursales; llenar manualmente
      la pestaña `Contactos` del Sheet si se quiere (no la usa el visor, solo referencia).
- [ ] **PMS**: probar carga de Excel end-to-end ahora que el Apps Script ya está desplegado y
      verificado con `doGet` — es la primera vez que se prueba con datos reales.
- [ ] **Euro**: arreglar el encabezado de `♻️ Valorización` en el Sheet real — hoy tiene ~34
      columnas de fecha mal generadas (ver sección "Año en Valorización y Objetivos de Euro").
      Formatear como texto sin formato, dejar solo `Enero`..`Diciembre` (12 columnas), e insertar
      una columna `Año` nueva entre `Tipo` y `Enero`. Sin este arreglo manual en el Sheet, el
      código nuevo (que ya espera esa columna) no tiene dónde leer/escribir el año.
- [ ] **Urgente**: redesplegar el `.gs` actualizado (fix de `writeValorizacion` borrando la
      Meta % — ver bug #8 arriba) en Copec, Abastible, Gespania, Salfa, Euro y Ando — los 6
      archivos que vive en este repo. Hasta entonces, cualquier Excel que se suba antes de que
      termine de cargar "Cargar desde Sheets" puede seguir borrando la Meta % guardada.
      (Socovesa no tiene `.gs` en este repo — su Apps Script se mantiene aparte, no se tocó.)
- [ ] Ando: volver a escribir "5%" a mano en la fila `Meta %` de `Terminal Bus` en
      `♻️ Valorización` — se borró el 2026-07-27 por el bug #8 al subir el Excel real.
- [ ] Agregar manualmente el header `Tons. CO2eq. evitadas` (columna H) en la pestaña
      `Total Residuos` de los 5 Sheets ya existentes (Copec, Abastible, Gespania, Salfa, Euro) —
      hoy solo tienen 7 columnas de header; el JS/Apps Script ya escriben 8 pero sin el header
      la columna quedará sin nombre hasta agregarlo a mano.
- [ ] Agregar al Apps Script de Copec el soporte para `tipo:'totalResiduos'` en `doPost` y el
      campo `respel` en `doGet` (ver sección "Total Residuos + RESPEL" arriba) — sin esto, el
      JS ya calcula todo pero la sincronización a esas 2 hojas fallará silenciosamente (`no-cors`
      no reporta error de HTTP).
- [ ] Ando: probar carga de Excel end-to-end ahora que el Apps Script ya está desplegado, y confirmar
      que "Cumplimiento normativa SINADER"/"Incorporar KPI de costo - valorización" calzan
      con los datos reales (son los primeros objetivos de Ando con esos nombres exactos, y el
      cálculo `sinader`/`kpi_costo` se reutilizó de Abastible/Salfa sin poder verificarlo
      contra datos reales de Ando todavía).
- [ ] Abastible: crear la pestaña `Total Residuos` en su Google Sheet (headers:
      `Sucursal | Mes | Residuo | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas`)
      — sigue pendiente. **El resto de este punto ya está hecho** (ver nota 2026-08-04 abajo):
      el usuario ya pegó `Code-Abastible.gs` actualizado en su Apps Script real, que agrega
      soporte para `tipo:'totalResiduos'` y corrige `writeObjetivos` (borraba por prefijo de
      empresa completo en vez de por sucursal+mes, con riesgo de perder histórico de objetivos
      al sincronizar).
- [x] Abastible (2026-08-04): el usuario agregó la hoja `Respel` al Sheet real (formato
      Residuo→RESPEL TRUE/FALSE, igual que Copec/Euro), `Code-Abastible.gs` se actualizó con
      `readRespelSheet_()` (expone `respel` en `doGet`) y el usuario ya pegó ese `.gs`
      actualizado en el Apps Script real de Abastible — el visor ahora debería clasificar por
      la hoja en vez de por el fallback de nombre. **Pendiente de verificar en el visor real**
      (no solo local) que Baterías de plomo, Tubos Fluorescentes y Residuos contaminados con
      HC/pintura ya salgan excluidos de SINADER (antes del deploy solo se excluía el residuo
      literal "RESPEL" por el fallback en `isRespel()`).
- [ ] **Visor-de-Objetivos-Abastible** (repo aparte `recylink/Visor-de-Objetivos-Abastible`,
      GitHub Pages en `recylink.github.io/Visor-de-Objetivos-Abastible/`) — dashboard standalone
      para Abastible, subido una sola vez el 2026-07-27 y nunca conectado de verdad a datos
      reales. Root cause (2026-08-04): carga datos con JSONP (`<script src="...exec?callback=X">`,
      `cargarDatos()` línea ~2218 de su `index.html`), pero el `doGet` de `Code-Abastible.gs`
      ignoraba el parámetro `callback` y devolvía JSON crudo — el navegador lo interpreta como
      un bloque `{ ... }` con errores de sintaxis (las claves son strings, no labels válidos),
      dispara `scriptTag.onerror` → "No se pudo contactar la fuente de datos". Además, aunque
      se resolviera el JSONP, el payload que esa página espera (`{EMPRESAS, VAL_DATA,
      MESES_ACTIVOS}`, donde cada "EMPRESA" es en realidad una SUCURSAL) es un contrato
      totalmente distinto al `{valorizacion, trazabilidad, objetivos, respel}` que devuelve
      `doGet` para el visor multi-empresa.
      **Arreglado en `Code-Abastible.gs`:** se agregó `buildLegacyPayload_()` (arma
      `EMPRESAS`/`VAL_DATA`/`MESES_ACTIVOS` a partir de las mismas 3 hojas que ya lee `doGet`,
      reutilizando el mismo parseo tolerante de `%` que usa `valorizacion-recylink.html` —
      ver `parsePct_`) y `doGet` ahora detecta `e.parameter.callback`: si viene, responde
      `callback({...})` con `MimeType.JAVASCRIPT` en vez de JSON plano (el comportamiento sin
      `callback`, que usa el visor multi-empresa, no cambió). Contrato completo del payload
      legacy (`EMPRESAS[i].mensual/anual/cse/objetivos`, `VAL_DATA[id].meses/acumulado/meta`)
      documentado a mano leyendo `index.html` de ese repo — sin eso, campos como
      `emp.anual`/`emp.cse.encuesta` faltantes hacen crashear el render (acceso sin optional
      chaining). Probado localmente con datos mock en Node (parseo de "57.6%" vs `0.3` vs `1`,
      y que un `0` legítimo en `docs` no se pierda — bug real que apareció y se corrigió con
      `pickField_()` en vez de encadenar `a||b`, que descartaba un 0 real).
      **Pendiente:** el usuario debe pegar el `Code-Abastible.gs` actualizado en el Apps Script
      real de Abastible (mismo paso pendiente que el punto anterior) y luego falta verificar
      en vivo que `recylink.github.io/Visor-de-Objetivos-Abastible/` cargue datos reales.
- [x] Abastible (2026-08-04): a los residuos Respel no se les debe exigir declaración
      SINADER — se agregó la exclusión en `calcObjetivos()` (rama `obj.tipo==='sinader'`,
      `valorizacion-recylink.html`), reutilizando `isRespel()` igual que la exclusión ya
      existente de Donaciones, pero acotada a `empresaActual==='abastible'` (no se tocó el
      cálculo de Socovesa/Gespania/Ando que comparten el mismo tipo `sinader`).
      **También (mismo día):** tampoco se le exige declaración SINADER a la sucursal
      "Oficina Central" de Abastible — misma rama `sinader`, `rowsSinDon` queda vacío para
      esa sucursal (`empresaActual==='abastible' && suc==='Oficina Central'`), lo que hace
      que `total===0` y el objetivo se muestre como 100%/sin pendientes (mismo comportamiento
      que cuando no hay filas que exigir, no es un caso especial nuevo de la fórmula).
- [ ] Subir la app a GitHub Pages (usuario tiene `licarayen-bit.github.io`)
- [ ] Verificar que el Apps Script de Copec tenga la misma corrección de `writeObjetivos`
      que Socovesa (borrar por `empresa_id+mes`, no por prefijo completo) — Abastible ya
      queda corregido en `Code-Abastible.gs` (ver punto arriba)
- [ ] Confirmar que el Sheet de Abastible tenga la columna "Factura" en headers de
      `📊 Trazabilidad_Docs` (fila 5), agregada recientemente en el código
- [ ] Validar visualmente el formato unificado de Objetivos en las 3 empresas tras los
      últimos cambios en `renderCopecObjetivos`
- [ ] Gespania: verificar que las pestañas `Total Residuos` (headers: `Sucursal | Mes | Residuo
      | Valorizado/No Valorizado | Respel no respel | Total KG | Total M3 | Tons. CO2eq. evitadas`) y `RESPEL` (headers:
      `Residuo | RESPEL`) del Sheet ya tengan esos headers exactos — no se pudieron inspeccionar
      visualmente por una falla intermitente de la extensión de navegador durante el análisis
- [ ] Gespania: probar "Cargar desde Sheets" end-to-end una vez desplegado el Apps Script, y
      confirmar que el objetivo `Lograr un FGR de 0,2 m3/m2` (tipo manual) se pueda editar
      directamente en la hoja `🎯 Objetivos` del Sheet (columna `% cumplimiento`, fila con
      Objetivo = ese texto exacto)
- [ ] Euro: probar "Cargar desde Sheets"/carga de Excel end-to-end una vez desplegado, y
      confirmar que el % de valorización por volumen (m3) se vea razonable — es la primera
      empresa con esa base de cálculo, vale la pena una revisión visual extra
- [ ] Euro: si el usuario quiere, limpiar las hojas `Seguimiento_CSE` y `Config.Flat` del
      Sheet, que traen datos de otras empresas (ANDO, Copec, Daikin) por venir de una
      plantilla clonada — no bloquea nada, el visor no las usa
- [ ] **CCU**: cargar el Excel de trazabilidad real y confirmar que los nombres de sucursal
      calzan exactamente con `CCU_METAS` ("NPR - Embotelladora Renca", "CirCCUlar") — si el
      Excel trae una variante de escritura, la meta no se va a mostrar para esa sucursal.
- [ ] **CCU**: llenar a mano el "% cumplimiento" de "Gestionar Residuos Spot" en la hoja
      `🎯 Objetivos` del Sheet (tipo `manual`, no se calcula desde el Excel).
- [ ] **CCU**: revisar/limpiar la pestaña "Objetivos 2026" del Sheet, que quedó con un borrador
      de correo pegado por error (no lo usa el visor, es solo cosmético).
- [x] **Acciona**: el despliegue del Apps Script quedó restringido al crearlo (`doGet`
      devolvía `403 Acceso denegado`) — corregido 2026-07-31 cambiando "Quién tiene acceso" a
      "Cualquier usuario" en Implementar > Gestionar implementaciones. Verificado con `curl`:
      ahora responde `302` (redirect público normal) y el JSON esperado
      `{valorizacion:[],trazabilidad:[],objetivos:[],respel:[...]}`.
- [ ] **Acciona**: cargar el Excel de trazabilidad real para derivar las sucursales — la meta
      de 40% ahora se sincroniza automáticamente para todas (ver `getAccionaMetasDefault()`
      arriba); usar "✎ Editar metas" solo si alguna sucursal necesita un % distinto.
- [ ] **Acciona**: llenar a mano el "% cumplimiento" de "Apoyar en obtención de puntos para
      certificación CES..." en la hoja `🎯 Objetivos` del Sheet (tipo `manual`, no se calcula
      desde el Excel).
- [ ] **Acciona**: probar carga de Excel end-to-end una vez desplegado el Apps Script, y
      confirmar que el objetivo de segregación (9 residuos: Madera/Pallet/Vidrio/Fierro/PET/
      RESPEL/Plumavit/PVC/Film Stretch) y la exclusión de Escombro/Arena del %valorización
      se vean razonables con datos reales — son cálculos nuevos, sin verificar contra el
      Excel real de Acciona todavía.

## Cómo verificar sintaxis JS del archivo
El HTML es un solo archivo con `<script>...</script>` embebido. Para validar sintaxis:
```bash
python3 -c "
import re
content = open('valorizacion-recylink.html').read()
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)
open('/tmp/s.js','w').write(scripts[0])
"
node --check /tmp/s.js
```
(o usar `acorn` si `node --check` no está disponible en tu entorno)
