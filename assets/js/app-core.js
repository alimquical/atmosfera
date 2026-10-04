/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — app-core.js
   Núcleo de la aplicación: estado, utilidades de interfaz,
   enrutamiento de vistas, barra superior, eventos y PWA.
   ============================================================ */
(function () {
  'use strict';

  const U = window.Util;
  const E = window.AfEngine;
  const S = window.AfStats;
  const A = window.AfAgent;
  const D = window.AfDocs;
  const Store = window.AfStore;

  const App = window.App = {
    vista: 'panel',
    charts: {},
    chat: [],
    vistas: {},
    acciones: {},
    cambios: {},
    tabPlan: 'egresos',
    filtroPersonaPagos: 'todos',
    filtrosMov: { texto: '', tipo: '', categoria: '', lugar: '' },
    deferredInstall: null
  };

  App.P = function () { return Store.proyectoActivo(); };
  App.MES = function () { return E.mesActivo(App.P()); };
  App.guardar = function () { Store.mutado(); };
  App.U = U; App.E = E; App.S = S; App.A = A; App.D = D; App.Store = Store;

  /* ---------- DOM ---------- */
  const $ = App.$ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = App.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ============================================================
     UI BÁSICA
     ============================================================ */
  App.toast = function (msg, tipo) {
    const c = $('#toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + (tipo || '');
    d.innerHTML = msg;
    c.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; d.style.transition = '.35s'; }, 3000);
    setTimeout(() => { try { c.removeChild(d); } catch (e) { } }, 3500);
  };

  App.abrirModal = function (titulo, cuerpo, pie, ancho) {
    $('#modalTitulo').innerHTML = titulo;
    $('#modalCuerpo').innerHTML = cuerpo;
    $('#modalPie').innerHTML = pie || '';
    $('#modal').className = 'modal' + (ancho ? ' ancho' : '');
    $('#modalFondo').className = 'modal-fondo abierto';
  };

  App.cerrarModal = function () { $('#modalFondo').className = 'modal-fondo'; };

  App.avatar = function (persona, tam) {
    const t = tam || 30;
    return '<span class="avatar" style="background:' + (persona.color || '#2563EB') +
      ';width:' + t + 'px;height:' + t + 'px;font-size:' + Math.round(t * 0.38) + 'px">' +
      U.iniciales(persona.nombre) + '</span>';
  };

  App.estadoBadge = function (est) {
    if (est === 'pagado') return '<span class="badge-est b-pagado">Pagado</span>';
    if (est === 'parcial') return '<span class="badge-est b-parcial">Parcial</span>';
    return '<span class="badge-est b-pendiente">Pendiente</span>';
  };

  App.nivelBadge = function (n) {
    const m = { critico: 'b-critico', alta: 'b-alto', media: 'b-medio', info: 'b-info', ok: 'b-ok', baja: 'b-info' };
    return '<span class="badge-est ' + (m[n] || 'b-gris') + '">' + U.esc(n) + '</span>';
  };

  App.barra = function (pct, clase) {
    const v = Math.max(0, Math.min(100, (Number(pct) || 0) * 100));
    return '<div class="barra ' + (clase || '') + '"><i style="width:' + v.toFixed(1) + '%"></i></div>';
  };

  App.kpi = function (lab, val, sub, clase) {
    return '<div class="kpi ' + (clase || '') + '"><div class="lab">' + lab + '</div>' +
      '<div class="val">' + val + '</div><div class="sub">' + sub + '</div></div>';
  };

  App.vacio = function (titulo, texto, accion) {
    return '<div class="vacio"><div class="e-ico">📭</div><b>' + titulo + '</b><p>' + texto + '</p>' +
      (accion || '') + '</div>';
  };

  App.stat = function (k, v, n) {
    return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div>' +
      (n ? '<div class="n">' + n + '</div>' : '') + '</div>';
  };

  App.PALETA = ['#2563EB', '#F97316', '#16A34A', '#EAB308', '#DC2626',
    '#7C3AED', '#06B6D4', '#EC4899', '#84CC16', '#F59E0B', '#0EA5E9', '#A855F7'];

  /* ============================================================
     GRÁFICOS
     ============================================================ */
  App.destruirCharts = function () {
    Object.keys(App.charts).forEach(k => { try { App.charts[k].destroy(); } catch (e) { } });
    App.charts = {};
  };

  App.chart = function (id, cfg) {
    const c = document.getElementById(id);
    if (!c || !window.Chart) return;
    if (App.charts[id]) { try { App.charts[id].destroy(); } catch (e) { } }
    Chart.defaults.font.family = "'Inter','Segoe UI',system-ui,sans-serif";
    Chart.defaults.color = '#5A6478';
    Chart.defaults.font.size = 11.5;
    try { App.charts[id] = new Chart(c.getContext('2d'), cfg); }
    catch (e) { console.error('chart', id, e); }
  };

  /* ============================================================
     BARRA SUPERIOR
     ============================================================ */
  function mesesDisponibles() {
    const p = App.P();
    const set = {};
    (p.egresos || []).forEach(e => { if (e.mes) set[e.mes] = 1; });
    (p.ingresos || []).forEach(e => { if (e.mes) set[e.mes] = 1; });
    (p.movimientos || []).forEach(m => { const mm = U.mesDeFecha(m.fecha); if (mm) set[mm] = 1; });
    U.meses(24).forEach(m => set[m] = 1);
    return Object.keys(set).sort().reverse();
  }
  App.mesesDisponibles = mesesDisponibles;

  App.renderTopbar = function () {
    const lista = Store.listar();
    const sel = $('#selProyecto');
    sel.innerHTML = lista.map(x =>
      '<option value="' + x.id + '"' + (x.id === Store.actual() ? ' selected' : '') + '>' +
      U.esc(x.nombre) + '</option>').join('');

    const p = App.P();
    const mes = App.MES();
    const sm = $('#selMes');
    sm.innerHTML = mesesDisponibles().map(m =>
      '<option value="' + m + '"' + (m === mes ? ' selected' : '') + '>' + U.mesLargo(m) + '</option>').join('');

    let cuotasPendientes = 0;
    E.egresosDe(p, mes).forEach(eg => {
      const cuotas = E.cuotas(p, eg);
      Object.keys(cuotas).forEach(pid => { if (!E.pagoDe(eg, pid)) cuotasPendientes++; });
    });
    const b = $('#badgePagos');
    if (cuotasPendientes > 0) { b.style.display = ''; b.textContent = cuotasPendientes; }
    else b.style.display = 'none';

    const r = E.resumen(p, mes);
    $('#pieProyecto').innerHTML = '<b>' + U.esc(p.nombre || '') + '</b><br>' +
      r.nPersonas + ' miembro(s) · ' + U.esc(p.moneda) + ' · ' + U.mesCorto(mes) +
      (App.Auth && App.Auth.usuario ? '<br><span style="opacity:.75">@' + U.esc(App.Auth.usuario.u) +
        ' · ' + U.esc(App.Auth.rol()) + '</span>' : '');

    if (App.Auth && App.Auth.pintarChip) App.Auth.pintarChip();
    const btnP = $('#btnNuevoProyecto');
    if (btnP) btnP.style.display = (App.Auth && App.Auth.esDemo()) ? 'none' : '';
  };

  /* ============================================================
     ENRUTAMIENTO
     ============================================================ */
  App.navegar = function (v) {
    App.vista = v;
    $$('.nav-item').forEach(x => x.classList.toggle('activo', x.dataset.vista === v));
    $('#sidebar').classList.remove('abierta');
    $('#scrim').classList.remove('on');
    App.render();
    $('#contenido').scrollTop = 0;
  };

  App.render = function () {
    let p = Store.proyectoActivo();
    if (!p) { Store.asegurarDatos(); p = Store.proyectoActivo(); }
    if (!p) return;

    App.destruirCharts();
    App.renderTopbar();

    const c = $('#contenido');
    const fn = App.vistas[App.vista];
    c.innerHTML = fn ? fn() : '<div class="vacio"><b>Vista no encontrada</b></div>';
    if (App.postRender) App.postRender(App.vista);
  };

  App.postRender = function (vista) {
    if (typeof App.vistas['post_' + vista] === 'function') App.vistas['post_' + vista]();
  };

  /* ============================================================
     EVENTOS GLOBALES
     ============================================================ */
  function disparar(nombre, dataset, ev) {
    const Auth = App.Auth;
    if (Auth && !Auth.puede(nombre)) { Auth.rechazar(nombre); return; }
    const fn = App.acciones[nombre];
    if (!fn) { console.warn('Acción no registrada:', nombre); return; }
    fn(dataset, ev);
  }

  document.addEventListener('click', function (ev) {
    const t = ev.target.closest('[data-acc]');
    if (t) {
      ev.preventDefault();
      disparar(t.dataset.acc, t.dataset, ev);
      return;
    }
    const nav = ev.target.closest('.nav-item');
    if (nav) { App.navegar(nav.dataset.vista); }
  });

  document.addEventListener('change', function (ev) {
    const t = ev.target.closest('[data-chg]');
    if (t && App.Auth && !App.Auth.puedeCambio(t.dataset.chg)) { App.Auth.rechazar(); return; }
    if (t && App.cambios[t.dataset.chg]) App.cambios[t.dataset.chg](t.dataset, ev, t);
  });

  document.addEventListener('input', function (ev) {
    const t = ev.target;
    if (t.classList && (t.classList.contains('m-dist') || t.classList.contains('m-dist-range'))) {
      if (t.classList.contains('m-dist-range')) {
        const num = $$('.m-dist').find(x => x.dataset.per === t.dataset.per);
        if (num) num.value = t.value;
      } else {
        const rng = $$('.m-dist-range').find(x => x.dataset.per === t.dataset.per);
        if (rng) rng.value = t.value;
      }
      if (typeof App.recalcularModalDist === 'function') App.recalcularModalDist();
    }
    if (t.id === 'm-egr-valor' && typeof App.recalcularModalDist === 'function') {
      App.recalcularModalDist();
    }
    if (t.dataset && t.dataset.chg && t.tagName === 'INPUT' && t.type === 'text') {
      if (App.Auth && !App.Auth.puedeCambio(t.dataset.chg)) { App.Auth.rechazar(); return; }
      if (App.cambios[t.dataset.chg]) App.cambios[t.dataset.chg](t.dataset, ev, t);
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') App.cerrarModal();
    if (ev.target && ev.key === 'Enter' && ev.target.id === 'chatInput') {
      ev.preventDefault();
      const v = ev.target.value;
      ev.target.value = '';
      if (App.acciones['agente-enviar-con']) App.acciones['agente-enviar-con'](v);
    }
    if (ev.target && ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.accEnter) {
      disparar(ev.target.dataset.accEnter, ev.target.dataset, ev);
    }
  });

  /* ============================================================
     ACCIONES GENÉRICAS
     ============================================================ */
  App.acciones.ir = (d) => App.navegar(d.vista);
  App.acciones['cerrar-modal'] = () => App.cerrarModal();

  App.acciones['seleccionar-proyecto'] = () => { };

  App.cambios['proyecto'] = function (d, ev, el) {
    Store.setActual(el.value);
    App.chat = [];
    App.render();
    App.toast('Proyecto abierto', 'ok');
  };

  App.cambios['mes'] = function (d, ev, el) {
    const p = App.P();
    p.config.mesActivo = el.value;
    App.guardar();
    App.render();
  };

  App.acciones['tab-plan'] = function (d) {
    App.tabPlan = d.tab;
    App.render();
  };

  App.acciones.imprimir = () => window.print();

  /* ============================================================
     PWA
     ============================================================ */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    App.deferredInstall = e;
    const b = $('#btnInstalar');
    if (b) b.classList.add('visible');
  });

  App.acciones['instalar'] = async function () {
    if (!App.deferredInstall) {
      App.toast('Usá el menú del navegador → «Instalar aplicación» / «Agregar a pantalla de inicio»');
      return;
    }
    App.deferredInstall.prompt();
    const r = await App.deferredInstall.userChoice;
    App.deferredInstall = null;
    const b = $('#btnInstalar');
    if (b) b.classList.remove('visible');
    App.toast(r.outcome === 'accepted' ? '✅ Aplicación instalada' : 'Instalación cancelada',
      r.outcome === 'accepted' ? 'ok' : '');
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.log('SW no disponible (modo archivo):', e && e.message);
      });
    });
  }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  App.arrancar = function () {
    if (App._arrancado) { App.render(); return; }
    App._arrancado = true;
    Store.asegurarDatos();
    App.navegar('panel');
  };

  function iniciar() {
    const Auth = App.Auth;
    const sesion = Auth ? Auth.init() : {};

    $('#selProyecto').addEventListener('change', function () {
      Store.setActual(this.value);
      App.chat = [];
      App.render();
      App.toast('Proyecto abierto', 'ok');
    });

    $('#selMes').addEventListener('change', function () {
      const p = App.P();
      p.config.mesActivo = this.value;
      App.guardar();
      App.render();
    });

    $('#btnNuevoProyecto').addEventListener('click', function () {
      if (App.Auth && !App.Auth.puede('nuevo-proyecto')) { App.Auth.rechazar('nuevo-proyecto'); return; }
      App.acciones['nuevo-proyecto']();
    });
    $('#btnExportar').addEventListener('click', () => App.navegar('reportes'));
    $('#btnInstalar').addEventListener('click', () => App.acciones['instalar']());
    $('#modalCerrar').addEventListener('click', () => App.cerrarModal());
    $('#modalFondo').addEventListener('click', function (e) {
      if (e.target === this) App.cerrarModal();
    });
    $('#btnMenu').addEventListener('click', function () {
      $('#sidebar').classList.toggle('abierta');
      $('#scrim').classList.toggle('on');
    });
    $('#scrim').addEventListener('click', function () {
      $('#sidebar').classList.remove('abierta');
      this.classList.remove('on');
    });

    if (sesion) App.arrancar();
    else if (Auth) Auth.mostrarLogin();
    else App.arrancar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
