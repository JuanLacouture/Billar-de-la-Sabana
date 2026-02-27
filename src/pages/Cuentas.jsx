import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './Cuentas.css'

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
  '3 Bandas': { bg: 'bg-blue', text: 'text-blue' },
  'Pool':     { bg: 'bg-green', text: 'text-green' },
  'Mano de Cartas': { bg: 'bg-red', text: 'text-red' },
  'Libre':    { bg: 'bg-purple', text: 'text-purple' },
  'Bolirana': { bg: 'bg-orange', text: 'text-orange' },
}

function Cuentas({ onNavegar }) {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [, setTick] = useState(0)

  const cargarCuentas = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('cuentas')
      .select(`
        *,
        mesas(numero, tipo, precio_minuto),
        clientes(nombre, telefono)
      `)
      .eq('estado', 'abierta')
      .order('hora_apertura', { ascending: true })
    if (!error && data) setCuentas(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarCuentas()
    const intervalo = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const cuentasFiltradas = cuentas.filter(c => {
    const nombre = c.clientes?.nombre?.toLowerCase() ?? ''
    const mesa = String(c.mesas?.numero ?? '')
    const q = busqueda.toLowerCase()
    const matchBusqueda = nombre.includes(q) || mesa.includes(q)
    if (filtro === 'mesas') return matchBusqueda && c.mesa_id !== null
    return matchBusqueda
  })

  const totalAbierto = cuentas.reduce((acc, c) => {
    const seg = calcularSegundos(c.hora_apertura)
    const minutos = seg / 60
    const subtotalMesa = minutos * (c.mesas?.precio_minuto ?? 0)
    return acc + subtotalMesa + (c.subtotal_productos ?? 0)
  }, 0)

  const promedio = cuentas.length > 0 ? totalAbierto / cuentas.length : 0

  const formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

  const horaApertura = (hora) => {
    if (!hora) return '--'
    return new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="cu-root">
      {/* Sidebar */}
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
          <a className="cu-nav-item">
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

      {/* Main */}
      <main className="cu-main">
        <header className="cu-mobile-header">
          <span className="cu-mobile-script">Sabana</span>
          <button><span className="material-icons-outlined">menu</span></button>
        </header>

        <div className="cu-content">
          {/* Topbar */}
          <div className="cu-topbar">
            <div>
              <h2 className="cu-page-title">Gestión de Cuentas</h2>
              <p className="cu-page-sub">
                Hay <strong className="cu-highlight">{cuentas.length} cuentas abiertas</strong> en este momento.
              </p>
            </div>
            <button className="cu-btn-primary">
              <span className="material-icons-outlined">add_shopping_cart</span>Venta Directa
            </button>
          </div>

          {/* Stats */}
          <div className="cu-stats">
            <div className="cu-stat-card cu-stat-gold">
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

            <div className="cu-stat-card cu-stat-blue">
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

          {/* Filtros y búsqueda */}
          <div className="cu-toolbar">
            <div className="cu-filter-tabs">
              {['todos', 'mesas'].map(f => (
                <button
                  key={f}
                  className={`cu-tab ${filtro === f ? 'cu-tab-active' : ''}`}
                  onClick={() => setFiltro(f)}
                >
                  {f === 'todos' ? 'Todos' : 'Mesas'}
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
                    <tr>
                      <td colSpan={6} className="cu-empty">Cargando cuentas...</td>
                    </tr>
                  ) : cuentasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="cu-empty">No hay cuentas abiertas.</td>
                    </tr>
                  ) : (
                    cuentasFiltradas.map(cuenta => {
                      const seg = calcularSegundos(cuenta.hora_apertura)
                      const tiempoStr = segundosAFormato(seg)
                      const subtotalMesa = (seg / 60) * (cuenta.mesas?.precio_minuto ?? 0)
                      const total = subtotalMesa + (cuenta.subtotal_productos ?? 0)
                      const tipo = cuenta.mesas?.tipo ?? ''
                      const colores = colorTipo[tipo] ?? { bg: 'bg-slate', text: 'text-slate' }

                      return (
                        <tr key={cuenta.id} className="cu-row">
                          <td className="cu-td-mesa">
                            <span className={`cu-mesa-num ${colores.bg}`}>
                              {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}
                            </span>
                            <div>
                              <p className="cu-mesa-tipo">{tipo || 'Venta Directa'}</p>
                              <p className="cu-mesa-cliente">{cuenta.clientes?.nombre ?? 'Sin cliente'}</p>
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
                            <button className="cu-btn-ver">
                              <span className="material-icons-outlined">visibility</span>Ver
                            </button>
                            <button className="cu-btn-liquidar">
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
