import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './Cuentas.css'
import ConsumoMesa from './ConsumoMesa'
import DetalleCuenta from './DetalleCuenta'

function segundosAFormato(seg) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function calcularSegundos(horaInicio) {
  if (!horaInicio) return 0
  const diff = Math.floor((new Date() - new Date(horaInicio)) / 1000)
  return diff < 0 ? 0 : diff
}

const colorTipo = {
  '3 Bandas':       { bg: 'bg-blue' },
  'Pool':           { bg: 'bg-green' },
  'Mano de Cartas': { bg: 'bg-red' },
  'Libre':          { bg: 'bg-purple' },
  'Bolirana':       { bg: 'bg-orange' },
}

const METODO_LABEL = {
  efectivo:  'Efectivo',
  nequi:     'Nequi',
  daviplata: 'Daviplata',
  bold:      'Bold',
}

const METODO_COLORS = {
  efectivo:  'cu-hist-tag-yellow',
  nequi:     'cu-hist-tag-purple',
  daviplata: 'cu-hist-tag-pink',
  bold:      'cu-hist-tag-slate',
}

function Cuentas({ onNavegar }) {
  const [cuentas, setCuentas]               = useState([])
  const [cargando, setCargando]             = useState(true)
  const [busqueda, setBusqueda]             = useState('')
  const [filtro, setFiltro]                 = useState('todos')
  const [, setTick]                         = useState(0)

  // ── Navegación interna ──
  const [cuentaDetalle, setCuentaDetalle]   = useState(null)
  const [cuentaConsumo, setCuentaConsumo]   = useState(null)
  const [cuentaLiquidar, setCuentaLiquidar] = useState(null)

  // ── Histórico ──
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [historico, setHistorico]               = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [busquedaHist, setBusquedaHist]         = useState('')

  const cargarCuentas = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('cuentas')
      .select(`*, mesas(numero, tipo, precio_minuto), clientes(nombre, telefono)`)
      .eq('estado', 'abierta')
      .order('hora_apertura', { ascending: true })
    if (!error && data) setCuentas(data)
    setCargando(false)
  }

  const cargarHistorico = async () => {
    setLoadingHistorico(true)
    const { data } = await supabase
      .from('cuentas')
      .select(`*, mesas(numero, tipo), clientes(nombre)`)
      .eq('estado', 'liquidada')
      .order('hora_cierre', { ascending: false })
      .limit(80)
    if (data) setHistorico(data)
    setLoadingHistorico(false)
  }

  const abrirHistorico = () => {
    cargarHistorico()
    setMostrarHistorico(true)
  }

  useEffect(() => {
    cargarCuentas()
    const intervalo = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // ── Render condicional ──
  if (cuentaConsumo) {
    return (
      <ConsumoMesa
        cuenta={cuentaConsumo}
        irALiquidar={false}
        onVolver={() => { setCuentaConsumo(null); cargarCuentas() }}
      />
    )
  }
  if (cuentaLiquidar) {
    return (
      <ConsumoMesa
        cuenta={cuentaLiquidar}
        irALiquidar={true}
        onVolver={() => { setCuentaLiquidar(null); cargarCuentas() }}
      />
    )
  }
  if (cuentaDetalle) {
    return (
      <DetalleCuenta
        cuenta={cuentaDetalle}
        onVolver={() => { setCuentaDetalle(null); cargarCuentas() }}
        onLiquidar={() => {
          const c = cuentaDetalle
          setCuentaDetalle(null)
          setCuentaLiquidar(c)
        }}
        onAgregarProductos={() => {
          const c = cuentaDetalle
          setCuentaDetalle(null)
          setCuentaConsumo(c)
        }}
      />
    )
  }

  // ── Filtros ──
  const cuentasFiltradas = cuentas.filter(c => {
    const nombre = c.clientes?.nombre?.toLowerCase() ?? ''
    const numero = String(c.mesas?.numero ?? '')
    const tipo   = c.mesas?.tipo?.toLowerCase() ?? ''
    const q      = busqueda.toLowerCase()
    const matchBusqueda = nombre.includes(q) || numero.includes(q) || tipo.includes(q)
    if (filtro === 'mesas')         return matchBusqueda && c.mesa_id !== null
    if (filtro === 'venta_directa') return matchBusqueda && c.mesa_id === null
    return matchBusqueda
  })

  const historicoFiltrado = historico.filter(c => {
    const q = busquedaHist.toLowerCase()
    const nombre = c.clientes?.nombre?.toLowerCase() ?? ''
    const numero = String(c.mesas?.numero ?? '')
    return nombre.includes(q) || numero.includes(q)
  })

  const totalAbierto = cuentas.reduce((acc, c) => {
    const seg = calcularSegundos(c.hora_apertura)
    const subtotalMesa = (seg / 60) * (c.mesas?.precio_minuto ?? 0)
    return acc + subtotalMesa + (c.subtotal_productos ?? 0)
  }, 0)

  const promedio = cuentas.length > 0 ? totalAbierto / cuentas.length : 0

  const formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  const horaApertura = (hora) => {
    if (!hora) return '--'
    return new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const formatFecha = (iso) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatHora = (iso) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="cu-root">

      {/* ── MODAL HISTÓRICO ── */}
      {mostrarHistorico && (
        <div className="cu-hist-overlay" onClick={() => setMostrarHistorico(false)}>
          <div className="cu-hist-modal" onClick={e => e.stopPropagation()}>
            <div className="cu-hist-header">
              <div className="cu-hist-title-row">
                <div className="cu-hist-title-icon">
                  <span className="material-icons-outlined">history</span>
                </div>
                <div>
                  <h3 className="cu-hist-title">Histórico de Cuentas</h3>
                  <p className="cu-hist-sub">Cuentas liquidadas · {historico.length} registros</p>
                </div>
              </div>
              <button className="cu-hist-close" onClick={() => setMostrarHistorico(false)}>
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="cu-hist-search-row">
              <div className="cu-hist-search-wrap">
                <span className="material-icons-outlined cu-hist-search-icon">search</span>
                <input
                  className="cu-hist-search"
                  type="text"
                  placeholder="Buscar cliente o mesa..."
                  value={busquedaHist}
                  onChange={e => setBusquedaHist(e.target.value)}
                />
              </div>
              <span className="cu-hist-count">{historicoFiltrado.length} resultados</span>
            </div>

            <div className="cu-hist-body">
              {loadingHistorico ? (
                <div className="cu-hist-loading">
                  <span className="material-icons-outlined cu-hist-spin">autorenew</span>
                  Cargando historial...
                </div>
              ) : historicoFiltrado.length === 0 ? (
                <div className="cu-hist-empty">
                  <span className="material-icons-outlined">receipt_long</span>
                  <p>No hay cuentas en el historial.</p>
                </div>
              ) : (
                <table className="cu-hist-table">
                  <thead>
                    <tr className="cu-hist-thead">
                      <th>Mesa / Cliente</th>
                      <th>Fecha</th>
                      <th>Apertura</th>
                      <th>Cierre</th>
                      <th>Método</th>
                      <th className="cu-hist-th-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoFiltrado.map(c => {
                      const tipo    = c.mesas?.tipo ?? ''
                      const colores = colorTipo[tipo] ?? { bg: 'bg-slate' }
                      const metodo  = c.metodo_pago ?? 'efectivo'
                      return (
                        <tr key={c.id} className="cu-hist-tr">
                          <td>
                            <div className="cu-td-mesa">
                              {c.mesa_id ? (
                                <span className={`cu-mesa-num ${colores.bg}`}>
                                  {String(c.mesas?.numero ?? '--').padStart(2, '0')}
                                </span>
                              ) : (
                                <span className="cu-mesa-num bg-slate cu-mesa-dir">DIR</span>
                              )}
                              <div>
                                <p className="cu-mesa-tipo">{tipo || 'Venta Directa'}</p>
                                <p className="cu-mesa-cliente">{c.clientes?.nombre ?? 'Sin cliente'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="cu-hist-td">{formatFecha(c.hora_cierre)}</td>
                          <td className="cu-hist-td cu-mono">{formatHora(c.hora_apertura)}</td>
                          <td className="cu-hist-td cu-mono">{formatHora(c.hora_cierre)}</td>
                          <td className="cu-hist-td">
                            <span className={`cu-hist-tag ${METODO_COLORS[metodo] ?? 'cu-hist-tag-yellow'}`}>
                              {METODO_LABEL[metodo] ?? metodo}
                            </span>
                          </td>
                          <td className="cu-hist-td cu-hist-td-total">
                            {formatCOP((c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0))}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="cu-hist-footer">
              <div className="cu-hist-footer-stats">
                <div className="cu-hist-stat">
                  <span>Total recaudado</span>
                  <strong>
                    {formatCOP(historico.reduce((s, c) => s + (c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0), 0))}
                  </strong>
                </div>
                <div className="cu-hist-stat">
                  <span>Cuentas cerradas</span>
                  <strong>{historico.length}</strong>
                </div>
              </div>
              <button className="cu-hist-btn-cerrar" onClick={() => setMostrarHistorico(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="cu-sidebar">
        <div className="cu-sidebar-logo">
          <span className="material-icons-outlined cu-sidebar-icon">sports_esports</span>
          <div>
            <h1 className="cu-sidebar-title">Club de Billar</h1>
            <span className="cu-sidebar-script">Sabana</span>
          </div>
        </div>

        <nav className="cu-nav">
          <a className="cu-nav-item" onClick={() => onNavegar('dashboard')}>
            <span className="material-icons-outlined">dashboard</span>Dashboard
          </a>
          <a className="cu-nav-item">
            <span className="material-icons-outlined">inventory_2</span>Inventario
          </a>
          <a className="cu-nav-item cu-nav-active">
            <span className="material-icons-outlined">receipt_long</span>Cuentas
          </a>
          <a className="cu-nav-item">
            <span className="material-icons-outlined">bar_chart</span>Reportes
          </a>
          <a className="cu-nav-item" onClick={() => onNavegar('clientes')}>
            <span className="material-icons-outlined">people</span>Clientes
          </a>
        </nav>

        <div className="cu-sidebar-footer">
          <button className="cu-user-btn" onClick={handleLogout}>
            <div className="cu-user-avatar">A</div>
            <div className="cu-user-info">
              <p className="cu-user-name">Admin</p>
              <p className="cu-user-role">Gerente</p>
            </div>
            <span className="material-icons-outlined">settings</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="cu-main">
        <header className="cu-mobile-header">
          <span className="cu-mobile-script">Sabana</span>
          <button><span className="material-icons-outlined">menu</span></button>
        </header>

        <div className="cu-content">
          <div className="cu-topbar">
            <div>
              <h2 className="cu-page-title">Gestión de Cuentas</h2>
              <p className="cu-page-sub">
                Hay <strong className="cu-highlight">{cuentas.length} cuentas abiertas</strong> en este momento.
              </p>
            </div>
            <div className="cu-topbar-actions">
              <button className="cu-btn-historico" onClick={abrirHistorico}>
                <span className="material-icons-outlined">history</span>Ver Historial
              </button>
              <button className="cu-btn-primary">
                <span className="material-icons-outlined">add_shopping_cart</span>Venta Directa
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="cu-stats">
            <div className="cu-stat-card">
              <div className="cu-stat-accent cu-stat-accent-gold"></div>
              <div className="cu-stat-top">
                <div>
                  <p className="cu-stat-label">Balance Total Abierto</p>
                  <h3 className="cu-stat-value">{cargando ? '--' : formatCOP(totalAbierto)}</h3>
                  <p className="cu-stat-hint">Suma de todas las cuentas por cobrar</p>
                </div>
                <div className="cu-stat-icon cu-stat-icon-gold">
                  <span className="material-icons-outlined">account_balance_wallet</span>
                </div>
              </div>
            </div>

            <div className="cu-stat-card">
              <div className="cu-stat-accent cu-stat-accent-blue"></div>
              <div className="cu-stat-top">
                <div>
                  <p className="cu-stat-label">Cuenta Promedio</p>
                  <h3 className="cu-stat-value">{cargando ? '--' : formatCOP(promedio)}</h3>
                  <p className="cu-stat-hint cu-stat-trend">
                    <span className="material-icons-outlined">trending_up</span>+5% esta hora
                  </p>
                </div>
                <div className="cu-stat-icon cu-stat-icon-blue">
                  <span className="material-icons-outlined">analytics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="cu-toolbar">
            <div className="cu-filter-tabs">
              {[
                { key: 'todos',         label: 'Todos' },
                { key: 'mesas',         label: 'Mesas' },
                { key: 'venta_directa', label: 'Venta Directa' },
              ].map(f => (
                <button
                  key={f.key}
                  className={`cu-tab ${filtro === f.key ? 'cu-tab-active' : ''}`}
                  onClick={() => setFiltro(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="cu-search-wrapper">
              <span className="material-icons-outlined cu-search-icon">search</span>
              <input
                className="cu-search"
                type="text"
                placeholder="Buscar mesa o cliente..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="cu-table-wrapper">
            <div className="cu-table-scroll">
              <table className="cu-table">
                <thead>
                  <tr className="cu-thead-row">
                    <th>Mesa / Cliente</th>
                    <th>Hora Inicio</th>
                    <th>Tiempo Transcurrido</th>
                    <th>Productos</th>
                    <th>Total Actual</th>
                    <th className="cu-th-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={6} className="cu-empty">Cargando cuentas...</td></tr>
                  ) : cuentasFiltradas.length === 0 ? (
                    <tr><td colSpan={6} className="cu-empty">No hay cuentas abiertas.</td></tr>
                  ) : (
                    cuentasFiltradas.map(cuenta => {
                      const seg          = calcularSegundos(cuenta.hora_apertura)
                      const tiempoStr    = segundosAFormato(seg)
                      const subtotalMesa = (seg / 60) * (cuenta.mesas?.precio_minuto ?? 0)
                      const total        = subtotalMesa + (cuenta.subtotal_productos ?? 0)
                      const tipo         = cuenta.mesas?.tipo ?? ''
                      const colores      = colorTipo[tipo] ?? { bg: 'bg-slate' }

                      return (
                        <tr key={cuenta.id} className="cu-row">
                          <td>
                            <div className="cu-td-mesa">
                              {cuenta.mesa_id ? (
                                <span className={`cu-mesa-num ${colores.bg}`}>
                                  {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}
                                </span>
                              ) : (
                                <span className="cu-mesa-num bg-slate cu-mesa-dir">DIR</span>
                              )}
                              <div>
                                <p className="cu-mesa-tipo">{tipo || 'Venta Directa'}</p>
                                <p className="cu-mesa-cliente">{cuenta.clientes?.nombre ?? 'Sin cliente'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="cu-td-hora">{horaApertura(cuenta.hora_apertura)}</td>
                          <td className="cu-td-tiempo">
                            <div className="cu-timer">
                              <span className="material-icons-outlined">timer</span>
                              <span>{tiempoStr}</span>
                            </div>
                          </td>
                          <td className="cu-td-productos">
                            {cuenta.subtotal_productos > 0
                              ? formatCOP(cuenta.subtotal_productos)
                              : <span className="cu-empty-text">—</span>
                            }
                          </td>
                          <td className="cu-td-total">
                            <span className="cu-total-badge">{formatCOP(total)}</span>
                          </td>
                          <td className="cu-td-acciones">
                            <button
                              className="cu-btn-ver"
                              onClick={() => setCuentaDetalle(cuenta)}
                            >
                              <span className="material-icons-outlined">visibility</span>Ver
                            </button>
                            <button
                              className="cu-btn-liquidar"
                              onClick={() => setCuentaLiquidar(cuenta)}
                            >
                              <span className="material-icons-outlined">point_of_sale</span>Liquidar
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="cu-table-footer">
              <p className="cu-table-info">
                Mostrando {cuentasFiltradas.length} de {cuentas.length} cuentas abiertas
              </p>
              <div className="cu-pagination">
                <button className="cu-page-btn">
                  <span className="material-icons-outlined">chevron_left</span>
                </button>
                <button className="cu-page-btn cu-page-active">1</button>
                <button className="cu-page-btn">
                  <span className="material-icons-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="cu-footer-text">
            © 2026 Club de Billar Sabana. Sistema de Gestión Premium
          </div>
        </div>
      </main>
    </div>
  )
}

export default Cuentas