/* ============================================================
   ATMÓSFERA FINANCIERA DEL HOGAR — auth.js
   Usuarios, sesiones y permisos por rol:
     superadmin → todo (usuarios, ajustes globales, borrados totales)
     admin      → todo lo operativo, sin gestionar usuarios
     demo       → SÓLO LECTURA (ve la demo, no modifica nada)
   ============================================================ */
(function () {
  'use strict';
  const App = window.App, U = App.U;
  const $ = App.$;

  const K_USU = 'afh.usuarios.v1';
  const K_SES = 'afh.sesion.v1';

  const SEMILLA = [
    { u: 'superadmin', nombre: 'Super Admin', rol: 'superadmin', clave: 'Atm2026#Super' },
    { u: 'admin', nombre: 'Administrador', rol: 'admin', clave: 'Atm2026#Admin' },
    { u: 'demo', nombre: 'Demostración (solo lectura)', rol: 'demo', clave: 'demo2026' }
  ];

  const ROLES = {
    superadmin: { nombre: 'Superadmin', desc: 'Control total: usuarios, ajustes globales, borrado total y todos los datos.' },
    admin: { nombre: 'Administrador', desc: 'Crea y edita proyectos, egresos, ingresos, pagos y reportes. No gestiona usuarios ni borrados globales.' },
    demo: { nombre: 'Demo · solo lectura', desc: 'Puede recorrer la app, ver gráficos, informes y descargar documentos, pero no modifica ni borra nada.' }
  };

  const Auth = App.Auth = { usuario: null };

  /* ---------- hash determinista (mismo resultado en todos los dispositivos) ---------- */
  function hash(txt) {
    const s = 'afh$' + String(txt);
    let a = 0x811c9dc5, b = 0x1000193 ^ s.length, c = 0xdeadbeef;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      a = Math.imul(a ^ ch, 16777619) >>> 0;
      b = Math.imul(b + ch + i, 2654435761) >>> 0;
      c = (Math.imul(c ^ (ch + i), 2246822519) + (((c << 7) | (c >>> 25)) >>> 0)) >>> 0;
    }
    return ('00000000' + a.toString(16)).slice(-8) +
      ('00000000' + b.toString(16)).slice(-8) +
      ('00000000' + c.toString(16)).slice(-8);
  }
  Auth.hash = hash;

  /* ---------- almacenamiento ---------- */
  function leerUsu() {
    try {
      const raw = localStorage.getItem(K_USU);
      if (raw) return JSON.parse(raw);
    } catch (e) { }
    return null;
  }
  function escribirUsu(lista) {
    try { localStorage.setItem(K_USU, JSON.stringify(lista)); } catch (e) { }
  }
  Auth.lista = function () { return leerUsu() || []; };

  function sembrar() {
    const lista = SEMILLA.map(x => ({
      u: x.u, nombre: x.nombre, rol: x.rol, h: hash(x.clave), creado: new Date().toISOString()
    }));
    escribirUsu(lista);
    return lista;
  }

  /* ---------- init ---------- */
  Auth.init = function () {
    let lista = leerUsu();
    if (!lista || !lista.length) lista = sembrar();
    let sesion = null;
    try { sesion = JSON.parse(sessionStorage.getItem(K_SES) || 'null'); } catch (e) { }
    if (sesion && sesion.u) {
      const u = lista.find(x => x.u === sesion.u);
      if (u) { Auth.usuario = u; return u; }
      Auth.cerrarSesion(true);
    }
    return null;
  };

  Auth.actual = function () { return Auth.usuario; };
  Auth.rol = function () { return Auth.usuario ? Auth.usuario.rol : null; };
  Auth.esSuper = function () { return Auth.rol() === 'superadmin'; };
  Auth.esAdmin = function () { return Auth.rol() === 'admin' || Auth.rol() === 'superadmin'; };
  Auth.esDemo = function () { return Auth.rol() === 'demo'; };
  Auth.logueado = function () { return !!Auth.usuario; };

  Auth.entrar = function (usuario, clave) {
    const lista = leerUsu() || sembrar();
    const u = String(usuario || '').trim().toLowerCase();
    const encontrado = lista.find(x => x.u === u);
    if (!encontrado || encontrado.h !== hash(clave)) return null;
    Auth.usuario = encontrado;
    try { sessionStorage.setItem(K_SES, JSON.stringify({ u: encontrado.u, ts: Date.now() })); } catch (e) { }
    return encontrado;
  };

  Auth.cerrarSesion = function (silencioso) {
    Auth.usuario = null;
    try { sessionStorage.removeItem(K_SES); } catch (e) { }
    if (!silencioso) mostrarLogin();
  };

  /* ============================================================
     PERMISOS
     ============================================================ */
  const SOLO_LECTURA = new Set([
    'login-entrar', 'sesion-info', 'cerrar-sesion',
    'ir', 'tab-plan', 'cerrar-modal', 'imprimir', 'seleccionar-proyecto', 'instalar',
    'agente-enviar', 'agente-enviar-con', 'agente-pregunta', 'agente-limpiar',
    'descargar-excel', 'descargar-word', 'descargar-pdf', 'descargar-txt',
    'descargar-csv-eg', 'descargar-csv-mov', 'descargar-csv-ing', 'descargar-json',
    'exportar-proyecto-json'
  ]);

  const SOLO_LECTURA_CAMBIOS = /^(mes|proyecto|filtro|sel-|orden)/;

  Auth.puede = function (accion) {
    if (accion === 'login-entrar') return true;
    const u = Auth.usuario;
    if (!u) return false;
    if (u.rol === 'superadmin') return true;
    if (u.rol === 'admin') return !/^(usuario-|borrar-todo-almacen$|restaurar-demo$)/.test(accion);
    return SOLO_LECTURA.has(accion);
  };

  Auth.puedeCambio = function (nombre) {
    const u = Auth.usuario;
    if (!u) return false;
    if (u.rol === 'demo') return SOLO_LECTURA_CAMBIOS.test(nombre);
    return true;
  };

  Auth.rechazar = function (accion) {
    const rol = Auth.rol() || 'invitado';
    const msg = rol === 'demo'
      ? '🔒 Modo demo: sólo lectura. Ingresá con usuario <b>admin</b> o <b>superadmin</b> para modificar datos.'
      : '🔒 Tu rol <b>' + U.esc(ROLES[rol] ? ROLES[rol].nombre : rol) + '</b> no permite «' + U.esc(accion || 'esa acción') + '».';
    App.toast(msg, 'err');
  };

  /* guarda bloqueado para demo */
  const guardarOriginal = App.guardar;
  App.guardar = function () {
    if (Auth.esDemo()) return;
    guardarOriginal();
  };

  /* ============================================================
     PANTALLA DE ACCESO
     ============================================================ */
  function mostrarLogin() {
    const f = $('#loginFondo');
    if (!f) return;
    f.className = 'login-fondo on';
    setTimeout(() => { const u = $('#loginUser'); if (u) u.focus(); }, 80);
    const err = $('#loginError'); if (err) err.textContent = '';
    const p = $('#loginPass'); if (p) p.value = '';
  }
  function ocultarLogin() {
    const f = $('#loginFondo');
    if (f) f.className = 'login-fondo';
  }
  Auth.mostrarLogin = mostrarLogin;
  Auth.ocultarLogin = ocultarLogin;

  App.acciones['login-entrar'] = function () {
    const u = ($('#loginUser') || {}).value || '';
    const p = ($('#loginPass') || {}).value || '';
    const r = Auth.entrar(u, p);
    if (!r) {
      const e = $('#loginError');
      if (e) e.textContent = 'Usuario o clave incorrectos';
      const i = $('#loginPass'); if (i) i.value = '';
      return;
    }
    ocultarLogin();
    const er = $('#loginError'); if (er) er.textContent = '';
    App.chat = [];
    App.arrancar();
    App.toast('👋 Hola ' + r.nombre + ' · rol ' + ROLES[r.rol].nombre, 'ok');
  };

  App.acciones['sesion-info'] = function () {
    const u = Auth.usuario;
    if (!u) { mostrarLogin(); return; }
    const rol = ROLES[u.rol] || { nombre: u.rol, desc: '' };
    const cuerpo = '<div class="alerta n-info"><div class="a-ico">👤</div><div>' +
      '<b class="t">' + U.esc(u.nombre) + ' <span class="muted">(@' + U.esc(u.u) + ')</span></b>' +
      '<p><b>' + U.esc(rol.nombre) + '</b> — ' + U.esc(rol.desc) + '</p></div></div>' +
      '<p class="small muted">La sesión vive sólo en este dispositivo hasta que cierres.</p>';
    App.abrirModal('Sesión activa', cuerpo,
      (Auth.esSuper() ? '<button class="btn" data-acc="ir" data-vista="ajustes">👥 Gestionar usuarios</button>' : '') +
      '<span class="spacer"></span>' +
      '<button class="btn peligro" data-acc="cerrar-sesion">Cerrar sesión</button>');
  };

  App.acciones['cerrar-sesion'] = function () {
    App.cerrarModal();
    Auth.cerrarSesion();
    App.toast('Sesión cerrada');
  };

  /* ============================================================
     GESTIÓN DE USUARIOS (sólo superadmin)
     ============================================================ */
  App.acciones['usuario-nuevo'] = function () {
    cuerpoUsuario(null);
  };
  App.acciones['usuario-editar'] = function (d) {
    const u = Auth.lista().find(x => x.u === d.id);
    cuerpoUsuario(u);
  };

  function cuerpoUsuario(u) {
    const cuerpo = '<div class="campo fila"><div><label>Usuario (sin espacios)</label>' +
      '<input id="us-user" value="' + U.esc(u ? u.u : '') + '"' + (u ? ' readonly' : '') + ' placeholder="ej: carlos"></div>' +
      '<div><label>Nombre visible</label><input id="us-nombre" value="' + U.esc(u ? u.nombre : '') + '" placeholder="Nombre y apellido"></div></div>' +
      '<div class="campo fila"><div><label>Clave' + (u ? ' (dejar vacío para no cambiar)' : '') + '</label>' +
      '<input id="us-clave" type="password" placeholder="' + (u ? '••••••••' : 'mínimo 6 caracteres') + '"></div>' +
      '<div><label>Rol</label><select id="us-rol">' +
      Object.keys(ROLES).map(r => '<option value="' + r + '"' + (u && u.rol === r ? ' selected' : '') + '>' +
        ROLES[r].nombre + '</option>').join('') +
      '</select></div></div>' +
      '<div class="alerta n-info"><div class="a-ico">ℹ</div><div><b class="t">Qué puede hacer cada rol</b><ul>' +
      Object.keys(ROLES).map(r => '<li><b>' + ROLES[r].nombre + ':</b> ' + ROLES[r].desc + '</li>').join('') +
      '</ul></div></div>';

    App.abrirModal(u ? 'Editar usuario' : 'Nuevo usuario', cuerpo,
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn primario" data-acc="usuario-guardar" data-id="' + (u ? u.u : '') + '">💾 Guardar usuario</button>');
  }

  App.acciones['usuario-guardar'] = function (d) {
    const lista = Auth.lista();
    const u = String((($('#us-user') || {}).value || '')).trim().toLowerCase();
    const nombre = String((($('#us-nombre') || {}).value || '')).trim();
    const clave = ($('#us-clave') || {}).value || '';
    const rol = ($('#us-rol') || {}).value || 'demo';
    if (!u) { App.toast('Ingresá el usuario', 'err'); return; }
    if (!/^[a-z0-9._-]{2,}$/.test(u)) { App.toast('El usuario sólo puede tener letras, números, punto, guion o guion bajo', 'err'); return; }
    if (!nombre) { App.toast('Ingresá el nombre visible', 'err'); return; }

    const existente = lista.find(x => x.u === u);
    if (d.id) {
      if (!existente) { App.toast('Usuario no encontrado', 'err'); return; }
      existente.nombre = nombre;
      existente.rol = rol;
      if (clave) {
        if (clave.length < 6) { App.toast('La clave debe tener al menos 6 caracteres', 'err'); return; }
        existente.h = hash(clave);
      }
      if (Auth.usuario && Auth.usuario.u === u) Auth.usuario = existente;
      App.toast('✅ Usuario actualizado', 'ok');
    } else {
      if (existente) { App.toast('Ese usuario ya existe', 'err'); return; }
      if (clave.length < 6) { App.toast('La clave debe tener al menos 6 caracteres', 'err'); return; }
      lista.push({ u: u, nombre: nombre, rol: rol, h: hash(clave), creado: new Date().toISOString() });
      App.toast('✅ Usuario «' + u + '» creado', 'ok');
    }
    escribirUsu(lista);
    App.cerrarModal();
    App.render();
  };

  App.acciones['usuario-borrar'] = function (d) {
    const lista = Auth.lista();
    const u = lista.find(x => x.u === d.id);
    if (!u) return;
    if (u.u === (Auth.usuario || {}).u) { App.toast('No podés borrarte a vos mismo', 'err'); return; }
    if (u.rol === 'superadmin' && lista.filter(x => x.rol === 'superadmin').length <= 1) {
      App.toast('Debe quedar al menos un superadmin', 'err'); return;
    }
    App.abrirModal('Eliminar usuario',
      '<div class="alerta n-critico"><div class="a-ico">🗑</div><div><b class="t">¿Eliminar a ' +
      U.esc(u.nombre) + ' (@' + U.esc(u.u) + ')?</b><p>Dejará de poder ingresar en este dispositivo.</p></div></div>',
      '<button class="btn" data-acc="cerrar-modal">Cancelar</button>' +
      '<button class="btn peligro" data-acc="usuario-borrar-ok" data-id="' + u.u + '">Eliminar</button>');
  };

  App.acciones['usuario-borrar-ok'] = function (d) {
    const lista = Auth.lista().filter(x => x.u !== d.id);
    escribirUsu(lista);
    App.cerrarModal();
    App.render();
    App.toast('Usuario eliminado');
  };

  /* ============================================================
     NUBE: usuarios viajan con la copia
     ============================================================ */
  Auth.serializar = function () {
    return (leerUsu() || []).map(x => ({ u: x.u, nombre: x.nombre, rol: x.rol, h: x.h, creado: x.creado }));
  };
  Auth.restaurar = function (lista) {
    if (!lista || !lista.length) return false;
    escribirUsu(lista);
    const actual = Auth.usuario;
    if (actual) {
      const nuevo = lista.find(x => x.u === actual.u);
      Auth.usuario = nuevo || null;
      if (!nuevo) Auth.cerrarSesion(true);
    }
    return true;
  };

  /* chip de usuario en la barra superior */
  Auth.pintarChip = function () {
    const b = $('#btnUsuario');
    if (!b) return;
    const u = Auth.usuario;
    if (!u) { b.style.display = 'none'; return; }
    b.style.display = '';
    b.innerHTML = '<span class="ico">👤</span> ' + U.esc(u.nombre.split(' ')[0]) +
      '<span class="chip-rol r-' + u.rol + '">' + u.rol + '</span>';
  };
})();
