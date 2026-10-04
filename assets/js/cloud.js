/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — cloud.js
   Sincronización en la nube vía Google Apps Script + Google Drive.
   El endpoint lo configurás en Ajustes → Nube.
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U, Store = App.Store;
  const $ = App.$;

  const K = 'afh.nube.v1';
  const Cloud = App.Cloud = {
    cfg: { url: '', clave: '', auto: false, ultimaSync: '', ultimoEstado: '' }
  };

  /* ---------- configuración local ---------- */
  function cargarCfg() {
    try {
      const raw = localStorage.getItem(K);
      if (raw) Object.assign(Cloud.cfg, JSON.parse(raw));
    } catch (e) { }
  }
  Cloud.guardarCfg = function () {
    try { localStorage.setItem(K, JSON.stringify(Cloud.cfg)); } catch (e) { }
  };
  cargarCfg();

  function estado(txt, tipo) {
    Cloud.cfg.ultimoEstado = txt;
    const el = $('#nb-estado');
    if (el) {
      el.innerHTML = '<span class="badge-est ' + (tipo === 'ok' ? 'b-pagado' : tipo === 'err' ? 'b-pendiente' : 'b-parcial') +
        '">' + U.esc(txt) + '</span>';
    }
  }
  Cloud.estado = estado;

  function hayUrl() {
    return !!String(Cloud.cfg.url || '').trim();
  }

  async function pedir(query, cuerpo) {
    if (!hayUrl()) throw new Error('Falta la URL del servicio en Ajustes → Nube.');
    const url = String(Cloud.cfg.url).trim();
    const op = cuerpo
      ? {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(cuerpo)
      }
      : { method: 'GET' };
    const r = await fetch(query ? (url + (url.indexOf('?') >= 0 ? '&' : '?') + query) : url, op);
    const t = await r.text();
    let j;
    try { j = JSON.parse(t); } catch (e) { throw new Error('Respuesta no válida del servidor (' + t.slice(0, 80) + ')'); }
    if (!j.ok) throw new Error(j.error || 'Error del servidor');
    return j;
  }

  /* ---------- operaciones ---------- */
  Cloud.probar = async function () {
    estado('Conectando…');
    const j = await pedir('accion=ping');
    const n = j.hayDatos ? ('copia de ' + (j.actualizado || '').slice(0, 16).replace('T', ' ')) : 'sin copia todavía';
    estado('Conectado · ' + n, 'ok');
    return j;
  };

  Cloud.subir = async function () {
    if (!hayUrl()) throw new Error('Falta la URL del servicio en Ajustes → Nube.');
    estado('Subiendo…');
    const cuerpo = {
      accion: 'guardar',
      clave: Cloud.cfg.clave,
      dispositivo: navigator.platform || 'web',
      datos: Store.serializarTodo()
    };
    const j = await pedir(null, cuerpo);
    Cloud.cfg.ultimaSync = j.actualizado || new Date().toISOString();
    Cloud.guardarCfg();
    estado('Subido ' + (j.actualizado || '').slice(11, 19) + ' · ' + Math.round((j.tamano || 0) / 1024) + ' KB', 'ok');
    return j;
  };

  Cloud.bajar = async function () {
    if (!hayUrl()) throw new Error('Falta la URL del servicio en Ajustes → Nube.');
    if (!Cloud.cfg.clave) throw new Error('Falta la clave en Ajustes → Nube.');
    estado('Descargando…');
    const j = await pedir('accion=cargar&clave=' + encodeURIComponent(Cloud.cfg.clave));
    if (j.vacio) { estado('La nube está vacía', ''); return null; }
    const n = Store.restaurarTodo(j.datos);
    Cloud.cfg.ultimaSync = j.actualizado || new Date().toISOString();
    Cloud.guardarCfg();
    App.chat = [];
    App.render();
    estado('Descargado · ' + n + ' proyecto(s)', 'ok');
    return n;
  };

  /* ---------- sincronización automática ---------- */
  let temporizador = null;
  Cloud.programarAuto = function () {
    if (!Cloud.cfg.auto || !hayUrl()) return;
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(async function () {
      temporizador = null;
      try {
        await Cloud.subir();
        if (App.vista === 'ajustes') App.render();
      } catch (e) { estado('Auto-sync: ' + e.message, 'err'); }
    }, 8000);
  };

  /* engancha al guardado normal de la app */
  const guardarOriginal = App.guardar;
  App.guardar = function () {
    guardarOriginal();
    Cloud.programarAuto();
  };

  /* ============================================================
     ACCIONES
     ============================================================ */
  App.acciones['nube-guardar-cfg'] = function () {
    Cloud.cfg.url = (($('#nb-url') || {}).value || '').trim();
    Cloud.cfg.clave = (($('#nb-clave') || {}).value || '').trim();
    Cloud.cfg.auto = !!($('#nb-auto') || {}).checked;
    Cloud.guardarCfg();
    App.toast('Configuración de nube guardada', 'ok');
    App.render();
  };

  App.acciones['nube-probar'] = async function () {
    Cloud.cfg.url = (($('#nb-url') || {}).value || '').trim();
    Cloud.cfg.clave = (($('#nb-clave') || {}).value || '').trim();
    Cloud.guardarCfg();
    try { await Cloud.probar(); App.toast('✅ Conectado con Google Drive', 'ok'); }
    catch (e) { estado(e.message, 'err'); App.toast('❌ ' + e.message, 'err'); }
  };

  App.acciones['nube-subir'] = async function () {
    Cloud.cfg.url = (($('#nb-url') || {}).value || '').trim();
    Cloud.cfg.clave = (($('#nb-clave') || {}).value || '').trim();
    Cloud.guardarCfg();
    try { await Cloud.subir(); App.toast('☁️ Datos subidos a Drive', 'ok'); }
    catch (e) { estado(e.message, 'err'); App.toast('❌ ' + e.message, 'err'); }
  };

  App.acciones['nube-bajar'] = async function () {
    App.abrirModal('Descargar desde la nube',
      '<div class="alerta n-critico"><div class="a-ico">⚠</div><div><b class="t">Se reemplazarán TODOS los datos locales</b>' +
      '<p>Los proyectos guardados en este dispositivo serán sustituidos por los que estén en Google Drive. ' +
      'Si querés conservarlos, hacé antes una copia: <i>Mis proyectos → ⬇ JSON</i>.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="nube-bajar-ok">Sí, descargar y reemplazar</button>');
  };

  App.acciones['nube-bajar-ok'] = async function () {
    App.cerrarModal();
    try {
      const n = await Cloud.bajar();
      if (n) App.toast('☁️ ' + n + ' proyecto(s) cargado(s) desde Drive', 'ok');
      else App.toast('No hay copia en la nube todavía', '');
    } catch (e) { estado(e.message, 'err'); App.toast('❌ ' + e.message, 'err'); }
  };

  App.cambios['nube-auto'] = function (d, ev, el) {
    Cloud.cfg.auto = !!el.checked;
    Cloud.guardarCfg();
    App.toast(el.checked ? 'Sincronización automática activada' : 'Sincronización automática desactivada');
  };
})();
