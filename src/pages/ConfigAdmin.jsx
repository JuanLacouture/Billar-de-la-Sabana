import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './ConfigAdmin.css'


const formatCOP = (val) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val ?? 0)

const formatHora = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota',
  })
}

const formatFechaCompleta = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Bogota',
  })
}

const iniciales = (nombre) => {
  if (!nombre) return '?'
  return nombre.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()
}

const redondear50 = (v) => Math.round(v / 50) * 50



// ══════════════════════════════════════════════════════
//  RESUMEN DE CIERRE — Carta elegante
//  Reemplaza el componente ResumenCierre en ConfigAdmin.jsx
// ══════════════════════════════════════════════════════

function ResumenCierre({ resumen, onCerrar }) {
  const { cajaInicial, ventas, gastos, turnos, fechaCierre } = resumen

  const efectivo  = ventas.find(v => v.metodo === 'efectivo')?.total  ?? 0
  const nequi     = ventas.find(v => v.metodo === 'nequi')?.total     ?? 0
  const daviplata = ventas.find(v => v.metodo === 'daviplata')?.total ?? 0
  const bold      = ventas.find(v => v.metodo === 'bold')?.total      ?? 0
  const totalGastos  = gastos.reduce((s, g) => s + (g.precio ?? 0), 0)
  const gastosCaja   = gastos.filter(g => g.metodo_pago === 'Caja').reduce((s, g) => s + (g.precio ?? 0), 0)
  const entregaSobre = cajaInicial + efectivo - gastosCaja

  const fechaTexto = new Date(fechaCierre).toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Bogota',
  })

  const fmtHora = (iso) => new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota',
  })

  const fmtVal = (val) =>
    val === 0
      ? '—'
      : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val)

  const filas = [
    { label: 'Base',             val: cajaInicial,  destacado: false },
    { label: 'Entrego en sobre', val: entregaSobre, destacado: true  },
    { label: 'Nequi',            val: nequi,        destacado: false },
    { label: 'Daviplata',        val: daviplata,    destacado: false },
    { label: 'Bold',             val: bold,         destacado: false },
    { label: 'Gastos',           val: totalGastos,  destacado: false, esGasto: true },
  ]

  return (
    <div className="rc-overlay">

      {/* Partículas decorativas de fondo */}
      <div className="rc-particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`rc-particle rc-particle-${i + 1}`} />
        ))}
      </div>

      <div className="rc-carta-wrap">

        {/* ── Solapa superior de la carta ── */}
        <div className="rc-solapa">
          <div className="rc-solapa-inner">
            <div className="rc-solapa-logo">
              <span className="material-icons-outlined">sports_esports</span>
            </div>
            <div>
              <p className="rc-solapa-nombre">Club de Billar</p>
              <p className="rc-solapa-script">Sabana</p>
            </div>
          </div>
          {/* Triángulo de solapa */}
          <div className="rc-solapa-triangle" />
        </div>

        {/* ── Carta principal ── */}
        <div className="rc-carta">

          {/* Esquinas decorativas */}
          <div className="rc-corner rc-corner-tl" />
          <div className="rc-corner rc-corner-tr" />
          <div className="rc-corner rc-corner-bl" />
          <div className="rc-corner rc-corner-br" />

          {/* Fecha arriba derecha */}
          <p className="rc-fecha">{fechaTexto}</p>

          {/* Título */}
          <div className="rc-titulo-wrap">
            <div className="rc-titulo-line" />
            <h2 className="rc-titulo">Cierre de Caja</h2>
            <div className="rc-titulo-line" />
          </div>

          {/* Cuerpo: izquierda + derecha */}
          <div className="rc-cuerpo">

            {/* ── Columna izquierda: cifras ── */}
            <div className="rc-col-izq">
              {filas.map((f, i) => (
                <div
                  key={i}
                  className={`rc-fila ${f.destacado ? 'rc-fila-star' : ''} ${f.esGasto ? 'rc-fila-gasto' : ''}`}
                  style={{ animationDelay: `${0.1 + i * 0.07}s` }}
                >
                  <span className="rc-concepto">{f.label}</span>
                  <span className="rc-puntos" />
                  <span className={`rc-valor ${f.destacado ? 'rc-valor-star' : ''} ${f.esGasto && f.val > 0 ? 'rc-valor-gasto' : ''}`}>
                    {fmtVal(f.val)}
                  </span>
                </div>
              ))}
            </div>

            {/* Divisor vertical */}
            <div className="rc-divisor-v" />

            {/* ── Columna derecha: turnos ── */}
            <div className="rc-col-der">
              <p className="rc-turnos-label">Turnos</p>
              {turnos.map((t, i) => (
                <div
                  key={t.id}
                  className="rc-turno"
                  style={{ animationDelay: `${0.35 + i * 0.1}s` }}
                >
                  <div className="rc-turno-av">
                    {(t.nombre || '?').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="rc-turno-nombre">{t.nombre}</p>
                    <p className="rc-turno-horas">
                      {fmtHora(t.hora_inicio)}&nbsp;→&nbsp;{fmtHora(t.hora_fin)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Línea decorativa de firma */}
          <div className="rc-firma-row">
            <div className="rc-firma-line" />
            <span className="rc-firma-sello">
              <span className="material-icons-outlined">verified</span>
            </span>
            <div className="rc-firma-line" />
          </div>

          {/* Botón */}
          <button
            className="rc-btn"
            onClick={async () => { onCerrar(); await supabase.auth.signOut() }}
          >
            <span className="material-icons-outlined">check_circle</span>
            Entendido · Cerrar sesión
          </button>

        </div>

        {/* ── Sombra inferior de carta doblada ── */}
        <div className="rc-carta-sombra" />

      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  CONFIG ADMIN PRINCIPAL
// ══════════════════════════════════════════════════════
function ConfigAdmin({ onNavegar }) {
  const [turnos, setTurnos]             = useState([])
  const [gastos, setGastos]             = useState([])
  const [stats, setStats]               = useState({ ventas: 0, gastosMuest: 0, caja: 0 })
  const [hora, setHora]                 = useState('')
  const [fecha, setFecha]               = useState('')
  const [cargando, setCargando]         = useState(true)
  const [cerrando, setCerrando]         = useState(false)
  const [cerrandoTodo, setCerrandoTodo] = useState(false)
  const [userActual, setUserActual]     = useState(null)
  const [confirm, setConfirm]           = useState(null)
  const [resumen, setResumen]           = useState(null)   // datos del cierre


  // ── Reloj ──
  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setHora(ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }))
      setFecha(ahora.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }))
    }
    actualizar()
    const iv = setInterval(actualizar, 1000)
    return () => clearInterval(iv)
  }, [])


  // ── Cargar datos ──
  const cargar = async () => {
    setCargando(true)

    const { data: { user } } = await supabase.auth.getUser()
    setUserActual(user)

    // 1. Caja abierta
    const { data: cajaActual } = await supabase
      .from('caja')
      .select('*')
      .eq('is_open', true)
      .limit(1)
      .maybeSingle()

    const desde       = cajaActual?.fecha_apertura ?? new Date(new Date().setHours(0,0,0,0)).toISOString()
    const cajaInicial = cajaActual?.caja_inicial ?? 0

    // 2. Turnos abiertos
    const { data: turnosData } = await supabase
      .from('turnos')
      .select('*')
      .is('hora_fin', null)
      .order('hora_inicio', { ascending: true })

    // 3. Perfiles
    const adminIds = [...new Set((turnosData ?? []).map(t => t.admin_id))]
    let profilesMap = {}
    if (adminIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds)
      ;(profilesData ?? []).forEach(p => { profilesMap[p.id] = p })
    }
    const turnosConPerfil = (turnosData ?? []).map(t => ({
      ...t, profiles: profilesMap[t.admin_id] ?? null,
    }))

    // 4. Gastos
    const { data: gastosData } = await supabase
      .from('gastos')
      .select('*')
      .gte('created_at', desde)
      .order('created_at', { ascending: false })

    // 5. Ventas
    const { data: cuentasData } = await supabase
      .from('cuentas')
      .select('subtotal_productos, subtotal_tiempo, metodo_pago')
      .eq('estado', 'liquidada')
      .gte('hora_cierre', desde)

    const totalVentas = (cuentasData ?? []).reduce((s, c) =>
      s + redondear50((c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)), 0)

    const ventasEfectivo = (cuentasData ?? [])
      .filter(c => c.metodo_pago === 'efectivo')
      .reduce((s, c) => s + redondear50((c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)), 0)

    const gastosCaja = (gastosData ?? [])
      .filter(g => g.metodo_pago === 'Caja')
      .reduce((s, g) => s + (g.precio ?? 0), 0)

    const totalGastos = (gastosData ?? []).reduce((s, g) => s + (g.precio ?? 0), 0)

    setTurnos(turnosConPerfil)
    setGastos(gastosData ?? [])
    setStats({
      ventas:      totalVentas,
      gastosMuest: totalGastos,
      caja:        cajaInicial + ventasEfectivo - gastosCaja,
    })
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])


  // ── Cerrar turno propio ──
  const cerrarTurnoPropio = async () => {
    setCerrando(true)
    const turno = turnos.find(t => t.admin_id === userActual?.id)
    if (turno) {
      await supabase.from('turnos').update({ hora_fin: new Date().toISOString() }).eq('id', turno.id)
    }
    await supabase.auth.signOut()
  }


  // ── Cerrar Todo → recopilar resumen → cerrar caja y turnos ──
  const cerrarTodos = async () => {
    setCerrandoTodo(true)
    const ahora = new Date().toISOString()

    // --- Recopilar datos para el resumen ANTES de cerrar ---

    // Caja actual
    const { data: cajaActual } = await supabase
      .from('caja').select('*').eq('is_open', true).limit(1).maybeSingle()

    const desde       = cajaActual?.fecha_apertura ?? new Date(new Date().setHours(0,0,0,0)).toISOString()
    const cajaInicial = cajaActual?.caja_inicial ?? 0

    // Ventas agrupadas por método
    const { data: cuentasData } = await supabase
      .from('cuentas')
      .select('subtotal_productos, subtotal_tiempo, metodo_pago')
      .eq('estado', 'liquidada')
      .gte('hora_cierre', desde)

    const metodos = ['efectivo', 'nequi', 'daviplata', 'bold']
    const ventas = metodos.map(m => ({
      metodo: m,
      total: (cuentasData ?? [])
        .filter(c => c.metodo_pago === m)
        .reduce((s, c) => s + redondear50((c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)), 0),
    }))

    // Todos los turnos de esta caja con perfiles
    const { data: todosLosTurnos } = await supabase
      .from('turnos')
      .select('*')
      .eq('caja_id', cajaActual?.id)
      .order('hora_inicio', { ascending: true })

    const adminIdsTurnos = [...new Set((todosLosTurnos ?? []).map(t => t.admin_id))]
    let pMap = {}
    if (adminIdsTurnos.length > 0) {
      const { data: pData } = await supabase
        .from('profiles').select('id, full_name, email').in('id', adminIdsTurnos)
      ;(pData ?? []).forEach(p => { pMap[p.id] = p })
    }
    const turnosResumen = (todosLosTurnos ?? []).map(t => ({
      id:          t.id,
      nombre:      pMap[t.admin_id]?.full_name || pMap[t.admin_id]?.email || 'Empleado',
      hora_inicio: t.hora_inicio,
      hora_fin:    t.hora_fin ?? ahora,
    }))

    // Gastos
    const { data: gastosData } = await supabase
      .from('gastos').select('*').gte('created_at', desde)

    // --- Cerrar caja y turnos ---
    await supabase.from('caja')
      .update({ is_open: false, fecha_cierre: ahora })
      .eq('is_open', true)

    await supabase.from('turnos')
      .update({ hora_fin: ahora })
      .is('hora_fin', null)

    setCerrandoTodo(false)
    setConfirm(null)

    // Mostrar resumen
    setResumen({
      cajaInicial,
      ventas,
      gastos:        gastosData ?? [],
      turnos:        turnosResumen,
      fechaApertura: desde,
      fechaCierre:   ahora,
    })
  }


  // ── Si hay resumen activo, mostrar pantalla de cierre ──
  if (resumen) {
    return <ResumenCierre resumen={resumen} onCerrar={() => { setResumen(null); cargar() }} />
  }


  return (
    <div className="ca-root">

      {confirm && (
        <div className="ca-overlay" onClick={() => setConfirm(null)}>
          <div className="ca-confirm" onClick={e => e.stopPropagation()}>
            <div className="ca-confirm-icon">
              <span className="material-icons-outlined">{confirm === 'todo' ? 'lock_reset' : 'hourglass_disabled'}</span>
            </div>
            <h3 className="ca-confirm-title">
              {confirm === 'todo' ? '¿Cerrar toda la caja?' : '¿Cerrar tu turno?'}
            </h3>
            <p className="ca-confirm-desc">
              {confirm === 'todo'
                ? 'Se cerrarán TODOS los turnos activos y la caja del día. Esta acción no se puede deshacer.'
                : 'Al cerrar tu turno se cerrará tu sesión automáticamente. La confirmación de que tu turno fue cerrado es que habrás salido del sistema.'}
            </p>
            <div className="ca-confirm-btns">
              <button className="ca-confirm-cancel" onClick={() => setConfirm(null)}>Cancelar</button>
              <button
                className={`ca-confirm-ok ${confirm === 'todo' ? 'ca-confirm-red' : 'ca-confirm-gold'}`}
                onClick={confirm === 'todo' ? cerrarTodos : cerrarTurnoPropio}
                disabled={cerrando || cerrandoTodo}
              >
                {(cerrando || cerrandoTodo) ? 'Cerrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ca-container">

        <nav className="ca-nav">
          <div className="ca-nav-left">
            <button className="ca-back-btn" onClick={() => onNavegar('dashboard')}>
              <span className="material-icons-outlined">arrow_back</span>Volver
            </button>
            <div className="ca-nav-logo">
              <div className="ca-nav-logo-img">
                <span className="material-icons-outlined">sports_esports</span>
              </div>
              <div>
                <p className="ca-nav-logo-name">Club de Billar Sabana</p>
                <p className="ca-nav-logo-role">Administrador</p>
              </div>
            </div>
          </div>
          <div className="ca-nav-right">
            <div className="ca-nav-clock">
              <span>{fecha}</span>
              <div className="ca-nav-clock-sep"></div>
              <strong>{hora}</strong>
            </div>
            <button className="ca-logout-btn" onClick={() => supabase.auth.signOut()}>
              <span className="material-icons-outlined">logout</span>Cerrar Sesión
            </button>
          </div>
        </nav>

        <header className="ca-header">
          <h1 className="ca-header-title">Configuración Administrativa</h1>
          <p className="ca-header-sub">Control de turnos, caja y supervisión de operaciones en tiempo real</p>
        </header>

        <div className="ca-stats-grid">
          <div className="ca-stat-card">
            <div className="ca-stat-top">
              <p className="ca-stat-label">Ventas del Turno</p>
              <div className="ca-stat-icon ca-icon-blue">
                <span className="material-icons-outlined">payments</span>
              </div>
            </div>
            <h3 className="ca-stat-value">{cargando ? '—' : formatCOP(stats.ventas)}</h3>
          </div>
          <div className="ca-stat-card">
            <div className="ca-stat-top">
              <p className="ca-stat-label">Gastos Registrados</p>
              <div className="ca-stat-icon ca-icon-red">
                <span className="material-icons-outlined">shopping_cart_checkout</span>
              </div>
            </div>
            <h3 className="ca-stat-value ca-stat-red">{cargando ? '—' : formatCOP(stats.gastosMuest)}</h3>
          </div>
          <div className="ca-stat-card ca-stat-card-gold">
            <div className="ca-stat-top">
              <p className="ca-stat-label">Caja en Efectivo</p>
              <div className="ca-stat-icon ca-icon-gold">
                <span className="material-icons-outlined">account_balance_wallet</span>
              </div>
            </div>
            <h3 className="ca-stat-value">{cargando ? '—' : formatCOP(stats.caja)}</h3>
          </div>
        </div>

        <section className="ca-actions-row">
          <div className="ca-action-card ca-action-gold">
            <div className="ca-action-info">
              <h2 className="ca-action-title">Cerrar Turno Actual</h2>
              <p className="ca-action-desc">Finaliza tu periodo de trabajo. Tu sesión se cerrará automáticamente.</p>
            </div>
            <button className="ca-btn-gold" onClick={() => setConfirm('turno')}>
              <span className="material-icons-outlined">hourglass_disabled</span>Cerrar Turno
            </button>
          </div>
          <div className="ca-action-card ca-action-grey">
            <div className="ca-action-info">
              <h2 className="ca-action-title ca-action-title-dark">Cerrar Caja General</h2>
              <p className="ca-action-desc">Cierre total. Genera el resumen del día con todos los ingresos y gastos.</p>
            </div>
            <button className="ca-btn-red" onClick={() => setConfirm('todo')}>
              <span className="material-icons-outlined">lock_reset</span>Cerrar Todo
            </button>
          </div>
        </section>

        <div className="ca-tables-grid">
          <div className="ca-table-card ca-table-main">
            <div className="ca-table-header">
              <div className="ca-table-header-left">
                <div className="ca-table-icon">
                  <span className="material-icons-outlined">groups</span>
                </div>
                <h3 className="ca-table-title">Turnos Activos</h3>
              </div>
              <span className="ca-badge-live">Operando Ahora</span>
            </div>
            <div className="ca-table-scroll">
              <table className="ca-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Hora Inicio</th>
                    <th>Caja Inicial</th>
                    <th className="ca-th-c">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={4} className="ca-empty">
                      <span className="material-icons-outlined ca-spin">autorenew</span> Cargando...
                    </td></tr>
                  ) : turnos.length === 0 ? (
                    <tr><td colSpan={4} className="ca-empty">No hay turnos activos</td></tr>
                  ) : turnos.map(t => {
                    const nombre = t.profiles?.full_name || t.profiles?.email || 'Empleado'
                    const esMio  = t.admin_id === userActual?.id
                    return (
                      <tr key={t.id} className={esMio ? 'ca-row-mine' : ''}>
                        <td>
                          <div className="ca-empleado">
                            <div className="ca-avatar">{iniciales(nombre)}</div>
                            <span className="ca-empleado-nombre">
                              {nombre} {esMio && <span className="ca-yo">(tú)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="ca-td-hora">{formatHora(t.hora_inicio)}</td>
                        <td className="ca-td-monto"><span className="ca-td-na">—</span></td>
                        <td className="ca-th-c">
                          <span className="ca-tag ca-tag-blue">Activo</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ca-table-card ca-gastos-card">
            <div className="ca-table-header">
              <div className="ca-table-header-left">
                <div className="ca-table-icon ca-table-icon-red">
                  <span className="material-icons-outlined">receipt_long</span>
                </div>
                <h3 className="ca-table-title">Registro de Gastos</h3>
              </div>
            </div>
            <div className="ca-gastos-list">
              {cargando ? (
                <div className="ca-empty">
                  <span className="material-icons-outlined ca-spin">autorenew</span> Cargando...
                </div>
              ) : gastos.length === 0 ? (
                <div className="ca-empty">Sin gastos registrados en esta caja</div>
              ) : gastos.map(g => (
                <div key={g.id} className="ca-gasto-item">
                  <div>
                    <p className="ca-gasto-nombre">{g.descripcion || g.lugar || 'Gasto'}</p>
                    <p className="ca-gasto-meta">
                      {formatHora(g.created_at)}
                      {g.lugar       ? ` · ${g.lugar}`       : ''}
                      {g.metodo_pago ? ` · ${g.metodo_pago}` : ''}
                    </p>
                  </div>
                  <span className="ca-gasto-monto">−{formatCOP(g.precio)}</span>
                </div>
              ))}
            </div>
            <div className="ca-gastos-footer">
              <span className="ca-gastos-footer-label">Total del Turno</span>
              <span className="ca-gastos-footer-valor">{formatCOP(stats.gastosMuest)}</span>
            </div>
          </div>
        </div>

        <p className="ca-footer">© 2026 Club de Billar Sabana. Sistema de Gestión Premium</p>
      </div>
    </div>
  )
}

export default ConfigAdmin
