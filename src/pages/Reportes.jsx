import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import './Reportes.css'

// ── Timezone fix ──
const TZ = 'America/Bogota'
function toDate(iso) {
  if (!iso) return null
  const s = String(iso)
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s)
  return new Date(s + 'Z')
}

const formatCOP = (val) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(val ?? 0)

const formatFecha = (iso) => {
  const d = toDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: TZ })
}

// Devuelve 'YYYY-MM-DD' en hora Colombia
function fechaISOCO(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

// ── Rangos de período ──
function getRango(periodo, desde, hasta) {
  const ahora = new Date()
  const hoy   = new Date(fechaISOCO(ahora) + 'T00:00:00-05:00')

  if (periodo === 'hoy') {
    return { desde: hoy.toISOString(), hasta: ahora.toISOString() }
  }
  if (periodo === 'semana') {
    const ini = new Date(hoy); ini.setDate(hoy.getDate() - 6)
    return { desde: ini.toISOString(), hasta: ahora.toISOString() }
  }
  if (periodo === 'mes') {
    const ini = new Date(hoy); ini.setDate(1)
    return { desde: ini.toISOString(), hasta: ahora.toISOString() }
  }
  if (periodo === 'personalizado') {
    const d = desde ? new Date(desde + 'T00:00:00-05:00') : hoy
    const h = hasta ? new Date(hasta + 'T23:59:59-05:00') : ahora
    return { desde: d.toISOString(), hasta: h.toISOString() }
  }
  return { desde: hoy.toISOString(), hasta: ahora.toISOString() }
}

const METODO_COLOR = {
  efectivo: '#D4AF37', nequi: '#8B5CF6', daviplata: '#EC4899', bold: '#6B7280',
}
const METODO_LABEL = {
  efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', bold: 'Bold',
}

// ══════════════════════════════════════════
//  GRÁFICA DE BARRAS SVG
// ══════════════════════════════════════════
function GraficaBarras({ datos }) {
  if (!datos || datos.length === 0) return (
    <div className="rp-chart-empty">
      <span className="material-icons-outlined">bar_chart</span>
      <p>Sin datos en este período</p>
    </div>
  )
  const maxVal = Math.max(...datos.map(d => d.valor), 1)
  const W = 520, H = 180, padR = 16, padT = 16, padB = 44
  const areaW = W - padR
  const areaH = H - padT - padB
  const barW  = Math.min(48, (areaW / datos.length) * 0.55)
  const gap   = areaW / datos.length

  return (
    <div className="rp-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }} className="rp-chart-svg">
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + areaH * (1 - pct)
          return (
            <g key={pct}>
              <line x1={0} y1={y} x2={W - padR} y2={y}
                stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="4 4" />
              <text x={-4} y={y + 4} fontSize="9" fill="currentColor" fillOpacity="0.35" textAnchor="end">
                {maxVal * pct >= 1000000
                  ? `${(maxVal * pct / 1000000).toFixed(1)}M`
                  : `${Math.round(maxVal * pct / 1000)}k`}
              </text>
            </g>
          )
        })}
        {datos.map((d, i) => {
          const x    = gap * i + gap / 2 - barW / 2
          const barH = Math.max((d.valor / maxVal) * areaH, 2)
          const y    = padT + areaH - barH
          const pct  = d.valor / maxVal
          const color = pct > 0.7 ? '#D4AF37' : pct > 0.4 ? '#c9a940' : '#d1d5db'
          const isMax = d.valor === maxVal
          return (
            <g key={i} className="rp-bar-group">
              <rect x={x} y={y} width={barW} height={barH} rx="4"
                fill={color} opacity={isMax ? 1 : 0.7} className="rp-bar-rect" />
              {isMax && (
                <text x={x + barW / 2} y={y - 6} fontSize="10" fontWeight="700"
                  fill={color} textAnchor="middle">
                  {d.valor >= 1000000
                    ? `${(d.valor / 1000000).toFixed(1)}M`
                    : `${Math.round(d.valor / 1000)}k`}
                </text>
              )}
              <text x={x + barW / 2} y={padT + areaH + 14} fontSize="10"
                fill="currentColor" fillOpacity="0.55" textAnchor="middle">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ══════════════════════════════════════════
//  INSIGHTS — sugerencias basadas en datos
// ══════════════════════════════════════════
function Insights({ cuentas, gastos, rankingProductos, ventasPorMetodo, kpis }) {
  const insights = useMemo(() => {
    const lista = []
    if (!cuentas.length) return lista

    // Día más rentable
    const porDia = {}
    cuentas.forEach(c => {
      const d = toDate(c.hora_cierre)
      if (!d) return
      const key = d.toLocaleDateString('es-CO', { weekday: 'long', timeZone: TZ })
      porDia[key] = (porDia[key] ?? 0) + (c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)
    })
    const [mejorDia, mejorDiaVal] = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0] ?? []
    if (mejorDia) {
      lista.push({
        icon: 'calendar_today',
        color: 'insight-gold',
        titulo: `${mejorDia.charAt(0).toUpperCase() + mejorDia.slice(1)} es el mejor día`,
        desc: `Generó ${formatCOP(mejorDiaVal)} — el día más rentable del período.`,
      })
    }

    // Método de pago dominante
    const topMetodo = ventasPorMetodo[0]
    if (topMetodo) {
      const totalVentas = ventasPorMetodo.reduce((s, m) => s + m.valor, 0)
      const pct = totalVentas > 0 ? Math.round((topMetodo.valor / totalVentas) * 100) : 0
      lista.push({
        icon: 'account_balance_wallet',
        color: 'insight-blue',
        titulo: `${topMetodo.label} domina los pagos`,
        desc: `${pct}% de las ventas se cobran en ${topMetodo.label} (${formatCOP(topMetodo.valor)}).`,
      })
    }

    // Producto estrella
    if (rankingProductos.length > 0) {
      const top = rankingProductos[0]
      lista.push({
        icon: 'emoji_events',
        color: 'insight-gold',
        titulo: `"${top.nombre}" lidera las ventas`,
        desc: `${top.cantidad} unidades vendidas · ${formatCOP(top.ingresos)} en ingresos.`,
      })
    }

    // Alerta de gastos altos
    if (kpis.totalGastos > 0 && kpis.totalVentas > 0) {
      const ratioPct = Math.round((kpis.totalGastos / kpis.totalVentas) * 100)
      if (ratioPct > 20) {
        lista.push({
          icon: 'warning',
          color: 'insight-red',
          titulo: `Gastos representan el ${ratioPct}% de ventas`,
          desc: `Los gastos (${formatCOP(kpis.totalGastos)}) son altos respecto a ventas. Revisar.`,
        })
      } else {
        lista.push({
          icon: 'check_circle',
          color: 'insight-green',
          titulo: `Gastos bajo control (${ratioPct}% de ventas)`,
          desc: `Margen saludable. El neto del período es ${formatCOP(kpis.totalVentas - kpis.totalGastos)}.`,
        })
      }
    }

    // Ticket promedio bajo
    if (kpis.ticketPromedio > 0 && kpis.ticketPromedio < 15000) {
      lista.push({
        icon: 'receipt_long',
        color: 'insight-blue',
        titulo: 'Ticket promedio por debajo de $15.000',
        desc: `Promedio actual: ${formatCOP(kpis.ticketPromedio)}. Considera combos o tiempo mínimo de mesa.`,
      })
    }

    // Hora pico
    const porHora = {}
    cuentas.forEach(c => {
      const d = toDate(c.hora_apertura)
      if (!d) return
      const h = d.toLocaleTimeString('es-CO', { hour: '2-digit', hour12: false, timeZone: TZ })
      porHora[h] = (porHora[h] ?? 0) + 1
    })
    const [horaPico, horaCnt] = Object.entries(porHora).sort((a, b) => b[1] - a[1])[0] ?? []
    if (horaPico && horaCnt > 1) {
      lista.push({
        icon: 'schedule',
        color: 'insight-purple',
        titulo: `Hora pico: ${horaPico}:00`,
        desc: `La mayoría de cuentas abren alrededor de las ${horaPico}:00 (${horaCnt} veces en el período).`,
      })
    }

    return lista.slice(0, 4)
  }, [cuentas, gastos, rankingProductos, ventasPorMetodo, kpis])

  if (!insights.length) return null

  return (
    <div className="rp-insights-wrap">
      <div className="rp-insights-header">
        <span className="material-icons-outlined">lightbulb</span>
        <h3 className="rp-insights-title">Insights del período</h3>
        <span className="rp-insights-badge">{insights.length} observaciones</span>
      </div>
      <div className="rp-insights-grid">
        {insights.map((ins, i) => (
          <div key={i} className={`rp-insight-card ${ins.color}`}>
            <div className="rp-insight-icon">
              <span className="material-icons-outlined">{ins.icon}</span>
            </div>
            <div className="rp-insight-body">
              <p className="rp-insight-titulo">{ins.titulo}</p>
              <p className="rp-insight-desc">{ins.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
//  REPORTES PRINCIPAL
// ══════════════════════════════════════════
function Reportes({ onNavegar }) {
  const [periodo, setPeriodo]         = useState('semana')
  const [fechaDesde, setFechaDesde]   = useState('')
  const [fechaHasta, setFechaHasta]   = useState('')
  const [mostrarFechas, setMostrarFechas] = useState(false)
  const [cargando, setCargando]       = useState(true)
  const [cuentas, setCuentas]         = useState([])
  const [gastos, setGastos]           = useState([])
  const [itemsVendidos, setItems]     = useState([])
  const [productos, setProductos]     = useState([])

  const cargar = async () => {
    setCargando(true)
    const { desde, hasta } = getRango(periodo, fechaDesde, fechaHasta)

    const [
      { data: cuentasData },
      { data: gastosData },
      { data: itemsData },
      { data: prodsData },
    ] = await Promise.all([
      supabase
        .from('cuentas')
        .select('id, subtotal_tiempo, subtotal_productos, metodo_pago, hora_cierre, hora_apertura, mesas(tipo)')
        .eq('estado', 'liquidada')
        .gte('hora_cierre', desde)
        .lte('hora_cierre', hasta)
        .order('hora_cierre', { ascending: false }),
      supabase
        .from('gastos')
        .select('id, descripcion, lugar, precio, metodo_pago, created_at')
        .gte('created_at', desde)
        .lte('created_at', hasta)
        .order('created_at', { ascending: false }),
      supabase
        .from('items_cuenta')
        .select('producto_id, cantidad, precio_unitario, cuentas(hora_cierre)')
        .gte('cuentas.hora_cierre', desde),
      supabase
        .from('productos')
        .select('id, nombre, categoria_id, categorias(nombre)'),
    ])

    setCuentas(cuentasData ?? [])
    setGastos(gastosData ?? [])
    const itemsFiltrados = (itemsData ?? []).filter(it => {
      const fecha = toDate(it.cuentas?.hora_cierre)
      return fecha && fecha >= new Date(desde) && fecha <= new Date(hasta)
    })
    setItems(itemsFiltrados)
    setProductos(prodsData ?? [])
    setCargando(false)
  }

  useEffect(() => {
    if (periodo !== 'personalizado') cargar()
  }, [periodo])

  const aplicarPersonalizado = () => {
    if (fechaDesde && fechaHasta) cargar()
  }

  // ── KPIs ──
  const kpis = useMemo(() => {
    const totalVentas    = cuentas.reduce((s, c) => s + (c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0), 0)
    const totalGastos    = gastos.reduce((s, g) => s + (g.precio ?? 0), 0)
    const totalCuentas   = cuentas.length
    const ticketPromedio = totalCuentas > 0 ? totalVentas / totalCuentas : 0
    return { totalVentas, totalGastos, totalCuentas, ticketPromedio }
  }, [cuentas, gastos])

  // ── Ventas por método ──
  const ventasPorMetodo = useMemo(() => {
    const map = {}
    cuentas.forEach(c => {
      const m = c.metodo_pago ?? 'efectivo'
      map[m] = (map[m] ?? 0) + (c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)
    })
    return Object.entries(map)
      .map(([k, v]) => ({ label: METODO_LABEL[k] ?? k, key: k, valor: v }))
      .sort((a, b) => b.valor - a.valor)
  }, [cuentas])

  // ── Ventas por día ──
  const ventasPorDia = useMemo(() => {
    if (periodo === 'hoy') return []
    const map = {}
    cuentas.forEach(c => {
      const d = toDate(c.hora_cierre)
      if (!d) return
      const key = d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: TZ })
      map[key] = (map[key] ?? 0) + (c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)
    })
    const dias = []
    const n = periodo === 'mes' ? 30 : periodo === 'personalizado' ? 14 : 7
    for (let i = Math.min(n - 1, 13); i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('es-CO', { weekday: 'short', timeZone: TZ })
      dias.push({ label: key, valor: map[key] ?? 0 })
    }
    return dias
  }, [cuentas, periodo])

  // ── Ranking productos ──
  const rankingProductos = useMemo(() => {
    const map = {}
    itemsVendidos.forEach(it => {
      const id = it.producto_id
      if (!id) return
      if (!map[id]) map[id] = { cantidad: 0, ingresos: 0 }
      map[id].cantidad += it.cantidad ?? 1
      map[id].ingresos += (it.cantidad ?? 1) * (it.precio_unitario ?? 0)
    })
    return Object.entries(map)
      .map(([id, data]) => {
        const prod = productos.find(p => p.id === parseInt(id))
        return { id, nombre: prod?.nombre ?? `Prod #${id}`, categoria: prod?.categorias?.nombre ?? '—', ...data }
      })
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8)
  }, [itemsVendidos, productos])

  const maxCantidad = rankingProductos[0]?.cantidad ?? 1

  // ── Label de período activo ──
  const periodoLabel = useMemo(() => {
    if (periodo === 'hoy')    return 'Hoy'
    if (periodo === 'semana') return 'Últimos 7 días'
    if (periodo === 'mes')    return 'Este mes'
    if (periodo === 'personalizado' && fechaDesde && fechaHasta)
      return `${fechaDesde} → ${fechaHasta}`
    return 'Personalizado'
  }, [periodo, fechaDesde, fechaHasta])

  const PERIODOS = [
    { key: 'hoy',           label: 'Hoy'          },
    { key: 'semana',        label: 'Semana'        },
    { key: 'mes',           label: 'Este mes'      },
    { key: 'personalizado', label: 'Personalizado' },
  ]

  return (
    <div className="rp-root">

      {/* ── SIDEBAR ── */}
      <aside className="rp-sidebar">
        <div className="rp-sidebar-logo">
          <span className="material-icons-outlined rp-sidebar-icon">sports_esports</span>
          <div>
            <h1 className="rp-sidebar-title">Club de Billar</h1>
            <span className="rp-sidebar-script">Sabana</span>
          </div>
        </div>
        <nav className="rp-nav">
          <a className="rp-nav-item" onClick={() => onNavegar?.('dashboard')}>
            <span className="material-icons-outlined">dashboard</span>Dashboard
          </a>
          <a className="rp-nav-item" onClick={() => onNavegar?.('inventario')}>
            <span className="material-icons-outlined">inventory_2</span>Inventario
          </a>
          <a className="rp-nav-item" onClick={() => onNavegar?.('cuentas')}>
            <span className="material-icons-outlined">receipt_long</span>Cuentas
          </a>
          <a className="rp-nav-item rp-nav-active">
            <span className="material-icons-outlined">bar_chart</span>Reportes
          </a>
          <a className="rp-nav-item" onClick={() => onNavegar?.('clientes')}>
            <span className="material-icons-outlined">people</span>Clientes
          </a>
        </nav>
        <div className="rp-sidebar-footer">
          <button className="rp-user-btn" onClick={() => supabase.auth.signOut()}>
            <div className="rp-user-avatar">A</div>
            <div className="rp-user-info">
              <p className="rp-user-name">Admin</p>
              <p className="rp-user-role">Gerente</p>
            </div>
            <span className="material-icons-outlined">settings</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="rp-main">

        {/* Header */}
        <header className="rp-header">
          <div>
            <h2 className="rp-header-title">Reportes</h2>
            <p className="rp-header-sub">
              Indicadores de rendimiento ·{' '}
              <span className="rp-header-periodo">{periodoLabel}</span>
            </p>
          </div>

          {/* Tabs de período */}
          <div className="rp-periodo-tabs">
            {PERIODOS.map(p => (
              <button
                key={p.key}
                className={`rp-periodo-tab ${periodo === p.key ? 'rp-periodo-active' : ''} ${p.key === 'personalizado' ? 'rp-tab-custom' : ''}`}
                onClick={() => {
                  setPeriodo(p.key)
                  if (p.key === 'personalizado') setMostrarFechas(true)
                  else setMostrarFechas(false)
                }}
              >
                {p.key === 'personalizado'
                  ? <><span className="material-icons-outlined">date_range</span>{p.label}</>
                  : p.label}
              </button>
            ))}
          </div>
        </header>

        {/* Panel de fechas personalizadas */}
        {periodo === 'personalizado' && (
          <div className="rp-fechas-panel">
            <span className="material-icons-outlined rp-fechas-icon">date_range</span>
            <div className="rp-fechas-field">
              <label className="rp-fechas-label">Desde</label>
              <input
                type="date"
                className="rp-fechas-input"
                value={fechaDesde}
                max={fechaHasta || fechaISOCO(new Date())}
                onChange={e => setFechaDesde(e.target.value)}
              />
            </div>
            <span className="rp-fechas-sep">→</span>
            <div className="rp-fechas-field">
              <label className="rp-fechas-label">Hasta</label>
              <input
                type="date"
                className="rp-fechas-input"
                value={fechaHasta}
                min={fechaDesde}
                max={fechaISOCO(new Date())}
                onChange={e => setFechaHasta(e.target.value)}
              />
            </div>
            <button
              className="rp-fechas-btn"
              onClick={aplicarPersonalizado}
              disabled={!fechaDesde || !fechaHasta || cargando}
            >
              {cargando
                ? <span className="material-icons-outlined rp-spin">autorenew</span>
                : <><span className="material-icons-outlined">search</span>Consultar</>
              }
            </button>
            {/* Accesos rápidos */}
            <div className="rp-fechas-quick">
              {[
                { label: 'Ayer', fn: () => {
                    const d = new Date(); d.setDate(d.getDate() - 1)
                    const s = fechaISOCO(d)
                    setFechaDesde(s); setFechaHasta(s)
                  }
                },
                { label: 'Últ. 14d', fn: () => {
                    const d = new Date(); d.setDate(d.getDate() - 13)
                    setFechaDesde(fechaISOCO(d)); setFechaHasta(fechaISOCO(new Date()))
                  }
                },
                { label: 'Mes ant.', fn: () => {
                    const ahora = new Date()
                    const ini = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
                    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0)
                    setFechaDesde(fechaISOCO(ini)); setFechaHasta(fechaISOCO(fin))
                  }
                },
              ].map(q => (
                <button key={q.label} className="rp-fechas-quick-btn" onClick={q.fn}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rp-content">

          {/* ══ KPIs ══ */}
          <div className="rp-kpis">
            <div className="rp-kpi rp-kpi-gold">
              <div className="rp-kpi-icon rp-kpi-icon-gold">
                <span className="material-icons-outlined">payments</span>
              </div>
              <div>
                <p className="rp-kpi-label">Total Ventas</p>
                <p className="rp-kpi-value">
                  {cargando ? <span className="rp-skeleton" /> : formatCOP(kpis.totalVentas)}
                </p>
                <p className="rp-kpi-sub">{kpis.totalCuentas} cuentas liquidadas</p>
              </div>
              <div className="rp-kpi-accent" />
            </div>
            <div className="rp-kpi">
              <div className="rp-kpi-icon rp-kpi-icon-blue">
                <span className="material-icons-outlined">analytics</span>
              </div>
              <div>
                <p className="rp-kpi-label">Ticket Promedio</p>
                <p className="rp-kpi-value">
                  {cargando ? <span className="rp-skeleton" /> : formatCOP(kpis.ticketPromedio)}
                </p>
                <p className="rp-kpi-sub">por cuenta</p>
              </div>
            </div>
            <div className="rp-kpi">
              <div className="rp-kpi-icon rp-kpi-icon-red">
                <span className="material-icons-outlined">receipt</span>
              </div>
              <div>
                <p className="rp-kpi-label">Total Gastos</p>
                <p className="rp-kpi-value rp-kpi-value-red">
                  {cargando ? <span className="rp-skeleton" /> : formatCOP(kpis.totalGastos)}
                </p>
                <p className="rp-kpi-sub">{gastos.length} registros</p>
              </div>
            </div>
            <div className="rp-kpi">
              <div className="rp-kpi-icon rp-kpi-icon-green">
                <span className="material-icons-outlined">trending_up</span>
              </div>
              <div>
                <p className="rp-kpi-label">Neto</p>
                <p className="rp-kpi-value rp-kpi-value-green">
                  {cargando ? <span className="rp-skeleton" /> : formatCOP(kpis.totalVentas - kpis.totalGastos)}
                </p>
                <p className="rp-kpi-sub">ventas − gastos</p>
              </div>
            </div>
          </div>

          {/* ══ INSIGHTS ══ */}
          {!cargando && cuentas.length > 0 && (
            <Insights
              cuentas={cuentas}
              gastos={gastos}
              rankingProductos={rankingProductos}
              ventasPorMetodo={ventasPorMetodo}
              kpis={kpis}
            />
          )}

          {/* ══ Gráfica + Métodos ══ */}
          <div className="rp-row-2">
            <div className="rp-card rp-card-wide">
              <div className="rp-card-header">
                <span className="material-icons-outlined">bar_chart</span>
                <h3 className="rp-card-title">Ventas por día</h3>
                <span className="rp-card-badge">{periodoLabel}</span>
              </div>
              {cargando ? (
                <div className="rp-loading"><span className="material-icons-outlined rp-spin">autorenew</span></div>
              ) : periodo === 'hoy' ? (
                <div className="rp-chart-empty">
                  <span className="material-icons-outlined">today</span>
                  <p>Vista diaria no aplica para gráfica de barras</p>
                </div>
              ) : (
                <GraficaBarras datos={ventasPorDia} />
              )}
            </div>

            <div className="rp-card">
              <div className="rp-card-header">
                <span className="material-icons-outlined">account_balance_wallet</span>
                <h3 className="rp-card-title">Métodos de pago</h3>
              </div>
              {cargando ? (
                <div className="rp-loading"><span className="material-icons-outlined rp-spin">autorenew</span></div>
              ) : ventasPorMetodo.length === 0 ? (
                <div className="rp-chart-empty">
                  <span className="material-icons-outlined">payments</span>
                  <p>Sin ventas en este período</p>
                </div>
              ) : (
                <div className="rp-metodos">
                  {ventasPorMetodo.map(m => {
                    const total = ventasPorMetodo.reduce((s, x) => s + x.valor, 0)
                    const pct   = total > 0 ? (m.valor / total) * 100 : 0
                    return (
                      <div key={m.key} className="rp-metodo-row">
                        <div className="rp-metodo-top">
                          <div className="rp-metodo-left">
                            <span className="rp-metodo-dot" style={{ background: METODO_COLOR[m.key] ?? '#6b7280' }} />
                            <span className="rp-metodo-label">{m.label}</span>
                          </div>
                          <div className="rp-metodo-right">
                            <span className="rp-metodo-val">{formatCOP(m.valor)}</span>
                            <span className="rp-metodo-pct">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="rp-metodo-bar-bg">
                          <div className="rp-metodo-bar-fill"
                            style={{ width: `${pct}%`, background: METODO_COLOR[m.key] ?? '#6b7280' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══ Ranking + Gastos ══ */}
          <div className="rp-row-2">
            <div className="rp-card rp-card-wide">
              <div className="rp-card-header">
                <span className="material-icons-outlined">emoji_events</span>
                <h3 className="rp-card-title">Productos más vendidos</h3>
                <span className="rp-card-badge">{rankingProductos.length} productos</span>
              </div>
              {cargando ? (
                <div className="rp-loading"><span className="material-icons-outlined rp-spin">autorenew</span></div>
              ) : rankingProductos.length === 0 ? (
                <div className="rp-chart-empty">
                  <span className="material-icons-outlined">inventory_2</span>
                  <p>Sin ventas de productos en este período</p>
                </div>
              ) : (
                <div className="rp-ranking">
                  {rankingProductos.map((p, i) => (
                    <div key={p.id} className="rp-ranking-row">
                      <span className={`rp-ranking-pos ${i < 3 ? 'rp-pos-top' : ''}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <div className="rp-ranking-info">
                        <p className="rp-ranking-nombre">{p.nombre}</p>
                        <p className="rp-ranking-cat">{p.categoria}</p>
                      </div>
                      <div className="rp-ranking-bar-wrap">
                        <div className="rp-ranking-bar"
                          style={{ width: `${(p.cantidad / maxCantidad) * 100}%` }} />
                      </div>
                      <div className="rp-ranking-nums">
                        <span className="rp-ranking-cant">{p.cantidad} u.</span>
                        <span className="rp-ranking-ingreso">{formatCOP(p.ingresos)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rp-card rp-card-gastos">
              <div className="rp-card-header">
                <span className="material-icons-outlined">shopping_cart_checkout</span>
                <h3 className="rp-card-title">Gastos del período</h3>
                <span className="rp-card-badge rp-badge-red">{gastos.length}</span>
              </div>
              {cargando ? (
                <div className="rp-loading"><span className="material-icons-outlined rp-spin">autorenew</span></div>
              ) : gastos.length === 0 ? (
                <div className="rp-chart-empty">
                  <span className="material-icons-outlined">receipt_long</span>
                  <p>Sin gastos en este período</p>
                </div>
              ) : (
                <div className="rp-gastos-list">
                  {gastos.map(g => (
                    <div key={g.id} className="rp-gasto-item">
                      <div className="rp-gasto-icon">
                        <span className="material-icons-outlined">receipt</span>
                      </div>
                      <div className="rp-gasto-info">
                        <p className="rp-gasto-desc">{g.descripcion || 'Gasto'}</p>
                        <p className="rp-gasto-meta">
                          {g.lugar}{g.metodo_pago ? ` · ${g.metodo_pago}` : ''} · {formatFecha(g.created_at)}
                        </p>
                      </div>
                      <span className="rp-gasto-monto">−{formatCOP(g.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
              {gastos.length > 0 && (
                <div className="rp-gastos-footer">
                  <span>Total</span>
                  <span>{formatCOP(kpis.totalGastos)}</span>
                </div>
              )}
            </div>
          </div>

          <p className="rp-footer">© 2026 Club de Billar Sabana. Sistema de Gestión Premium</p>
        </div>
      </main>
    </div>
  )
}

export default Reportes