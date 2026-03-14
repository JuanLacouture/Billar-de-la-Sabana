import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ConsumoMesa from './ConsumoMesa'
import './DashboardAdmin.css'


const colorTipo = {
  '3 Bandas':       'blue',
  'Pool':           'green',
  'Mano de Cartas': 'red',
  'Libre':          'purple',
  'Bolirana':       'orange',
}


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


function calcularValor(horaInicio, precioMinuto) {
  const seg     = calcularSegundos(horaInicio)
  const minutos = seg / 60
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(minutos * precioMinuto)
}


// ══════════════════════════════════════════════
//  MODAL INICIAR MESA
// ══════════════════════════════════════════════
function ModalIniciarMesa({ mesa, onConfirmar, onCancelar }) {
  const [clientes, setClientes]                       = useState([])
  const [busqueda, setBusqueda]                       = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [dropdownAbierto, setDropdownAbierto]         = useState(false)
  const [guardando, setGuardando]                     = useState(false)

  const horaTexto = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nombre, telefono')
      .order('nombre', { ascending: true })
      .then(({ data }) => { if (data) setClientes(data) })
  }, [])

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleSeleccionar = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusqueda(cliente.nombre)
    setDropdownAbierto(false)
  }

  const handleConfirmar = async () => {
    setGuardando(true)
    await onConfirmar(mesa, clienteSeleccionado)
    setGuardando(false)
  }

  return (
    <div className="da-modal-backdrop" onClick={onCancelar}>
      <div className="da-modal" onClick={e => e.stopPropagation()}>
        <div className="da-modal-header">
          <div className="da-modal-title-row">
            <span className="material-icons-outlined da-modal-icon">sports_bar</span>
            <div>
              <h3 className="da-modal-title">Iniciar Mesa</h3>
              <p className="da-modal-sub">Mesa {String(mesa.numero).padStart(2, '0')} · {mesa.tipo}</p>
            </div>
          </div>
          <button className="da-modal-close" onClick={onCancelar}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="da-modal-body">
          <div className="da-modal-info-row">
            <span className="material-icons-outlined">schedule</span>
            <span>Hora de apertura: <strong>{horaTexto}</strong></span>
          </div>

          <div className="da-modal-field">
            <label className="da-modal-label">
              <span className="material-icons-outlined">person_search</span>
              Cliente
            </label>
            <div className="da-modal-dropdown-wrapper">
              <input
                className="da-modal-input"
                type="text"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value)
                  setClienteSeleccionado(null)
                  setDropdownAbierto(true)
                }}
                onFocus={() => setDropdownAbierto(true)}
              />
              {dropdownAbierto && busqueda.length > 0 && (
                <ul className="da-modal-dropdown">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map(c => (
                      <li key={c.id} className="da-modal-dropdown-item" onClick={() => handleSeleccionar(c)}>
                        <span className="material-icons-outlined">person</span>
                        <div>
                          <p className="da-modal-dropdown-nombre">{c.nombre}</p>
                          {c.telefono && <p className="da-modal-dropdown-tel">{c.telefono}</p>}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="da-modal-dropdown-empty">Sin resultados</li>
                  )}
                </ul>
              )}
            </div>
            {clienteSeleccionado && (
              <p className="da-modal-selected">
                <span className="material-icons-outlined">check_circle</span>
                {clienteSeleccionado.nombre} seleccionado
              </p>
            )}
          </div>
        </div>

        <div className="da-modal-footer">
          <button className="da-modal-btn-cancel" onClick={onCancelar}>Cancelar</button>
          <button className="da-modal-btn-confirm" onClick={handleConfirmar} disabled={guardando}>
            <span className="material-icons-outlined">play_arrow</span>
            {guardando ? 'Iniciando...' : 'Confirmar inicio'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════
//  MODAL NUEVA CUENTA
// ══════════════════════════════════════════════
function ModalNuevaCuenta({ onConfirmar, onCancelar }) {
  const [clientes, setClientes]                         = useState([])
  const [busqueda, setBusqueda]                         = useState('')
  const [clienteSeleccionado, setClienteSeleccionado]   = useState(null)
  const [dropdownAbierto, setDropdownAbierto]           = useState(false)
  const [creando, setCreando]                           = useState(false)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nombre, telefono, is_compra_rapida')
      .order('nombre', { ascending: true })
      .then(({ data }) => { if (data) setClientes(data) })
  }, [])

  useEffect(() => {
    const cerrar = (e) => {
      if (!e.target.closest('.da-vd-dropdown-wrapper')) setDropdownAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleSeleccionar = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusqueda(cliente.nombre)
    setDropdownAbierto(false)
  }

  const limpiar = () => {
    setClienteSeleccionado(null)
    setBusqueda('')
    setDropdownAbierto(false)
  }

  const handleConfirmar = async () => {
    setCreando(true)
    await onConfirmar(clienteSeleccionado)
    setCreando(false)
  }

  const clienteRapido = clientes.find(c => c.is_compra_rapida)

  return (
    <div className="da-modal-backdrop" onClick={onCancelar}>
      <div className="da-vd-modal" onClick={e => e.stopPropagation()}>
        <div className="da-vd-header">
          <div className="da-vd-header-left">
            <div className="da-vd-icon">
              <span className="material-icons-outlined">add_shopping_cart</span>
            </div>
            <div>
              <h3 className="da-vd-title">Nueva Cuenta</h3>
              <p className="da-vd-sub">Sin mesa · Solo productos</p>
            </div>
          </div>
          <button className="da-vd-close" onClick={onCancelar}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="da-vd-body">
          <div className="da-vd-info-row">
            <span className="material-icons-outlined" style={{ fontSize: '1rem', flexShrink: 0 }}>info</span>
            <span>Puedes dejar la cuenta abierta o liquidarla directamente.</span>
          </div>

          <div className="da-vd-field">
            <label className="da-vd-label">
              <span className="material-icons-outlined">person_search</span>
              Asignar cliente
              <span className="da-vd-optional">· opcional</span>
            </label>
            <div className="da-vd-dropdown-wrapper">
              <div className="da-vd-input-wrap">
                <span className="material-icons-outlined da-vd-input-icon">search</span>
                <input
                  className="da-vd-input"
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={e => {
                    setBusqueda(e.target.value)
                    setClienteSeleccionado(null)
                    setDropdownAbierto(true)
                  }}
                  onFocus={() => setDropdownAbierto(true)}
                />
                {busqueda && (
                  <button className="da-vd-input-clear" onClick={limpiar}>
                    <span className="material-icons-outlined">close</span>
                  </button>
                )}
              </div>
              {dropdownAbierto && busqueda.length > 0 && (
                <ul className="da-vd-dropdown">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map(c => (
                      <li
                        key={c.id}
                        className={`da-vd-dropdown-item ${clienteSeleccionado?.id === c.id ? 'da-vd-item-active' : ''}`}
                        onMouseDown={() => handleSeleccionar(c)}
                      >
                        <div className="da-vd-avatar">{c.nombre.charAt(0).toUpperCase()}</div>
                        <div className="da-vd-item-info">
                          <p className="da-vd-item-nombre">{c.nombre}</p>
                          {c.telefono && <p className="da-vd-item-tel">{c.telefono}</p>}
                        </div>
                        {c.is_compra_rapida && (
                          <span className="da-vd-tag-rapida">
                            <span className="material-icons-outlined">bolt</span>Rápida
                          </span>
                        )}
                        {clienteSeleccionado?.id === c.id && (
                          <span className="material-icons-outlined da-vd-item-check">check_circle</span>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="da-vd-dropdown-empty">
                      <span className="material-icons-outlined">person_off</span>
                      Sin resultados
                    </li>
                  )}
                </ul>
              )}
            </div>
            {clienteSeleccionado && (
              <div className="da-vd-selected">
                <span className="material-icons-outlined">check_circle</span>
                Cuenta a nombre de <strong>{clienteSeleccionado.nombre}</strong>
              </div>
            )}
          </div>

          {clienteRapido && !clienteSeleccionado && (
            <button className="da-vd-rapida-btn" onClick={() => handleSeleccionar(clienteRapido)}>
              <span className="material-icons-outlined">bolt</span>
              Usar Compra Rápida
            </button>
          )}
        </div>

        <div className="da-vd-footer">
          <button className="da-vd-btn-cancel" onClick={onCancelar}>Cancelar</button>
          <button className="da-vd-btn-crear" onClick={handleConfirmar} disabled={creando}>
            <span className="material-icons-outlined">
              {creando ? 'hourglass_top' : 'receipt_long'}
            </span>
            {creando ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════
//  SIDEBAR FOOTER HOOK — reutilizable
// ══════════════════════════════════════════════
function useSidebarUser() {
  const [userInfo, setUserInfo] = useState({ email: '', role: '' })
  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      setUserInfo({ email: user.email ?? '', role: profile?.role ?? 'Usuario' })
    }
    cargar()
  }, [])
  return userInfo
}


// ══════════════════════════════════════════════
//  DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════
function DashboardAdmin({ onNavegar }) {
  const [mesas, setMesas]                     = useState([])
  const [filtro, setFiltro]                   = useState('Todo')
  const [cargando, setCargando]               = useState(true)
  const [, setTick]                           = useState(0)
  const [modalMesa, setModalMesa]             = useState(null)
  const [cuentaConsumo, setCuentaConsumo]     = useState(null)
  const [liquidarDirecto, setLiquidarDirecto] = useState(false)
  const [mostrarModalNC, setMostrarModalNC]   = useState(false)

  const userInfo = useSidebarUser()


  const formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val ?? 0)


  // ── Stats reales de caja ──
  const [statsReal, setStatsReal] = useState({ ventas: 0, caja: 0, cargando: true })

  const redondear50 = (v) => Math.round(v / 50) * 50

  const cargarStats = async () => {
    // 1. Caja abierta hoy
    const { data: cajaActual } = await supabase
      .from('caja')
      .select('caja_inicial, fecha_apertura')
      .eq('is_open', true)
      .limit(1)
      .maybeSingle()

    const desde      = cajaActual?.fecha_apertura ?? new Date(new Date().setHours(0,0,0,0)).toISOString()
    const cajaInicial = cajaActual?.caja_inicial ?? 0

    // 2. Cuentas liquidadas desde apertura
    const { data: cuentasData } = await supabase
      .from('cuentas')
      .select('subtotal_productos, subtotal_tiempo, metodo_pago')
      .eq('estado', 'liquidada')
      .gte('hora_cierre', desde)

    // 3. Gastos desde apertura
    const { data: gastosData } = await supabase
      .from('gastos')
      .select('precio, metodo_pago')
      .gte('created_at', desde)

    const totalVentas = (cuentasData ?? []).reduce((s, c) =>
      s + redondear50((c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)), 0)

    const ventasEfectivo = (cuentasData ?? [])
      .filter(c => c.metodo_pago === 'efectivo')
      .reduce((s, c) => s + redondear50((c.subtotal_tiempo ?? 0) + (c.subtotal_productos ?? 0)), 0)

    const gastosCaja = (gastosData ?? [])
      .filter(g => g.metodo_pago === 'Caja')
      .reduce((s, g) => s + (g.precio ?? 0), 0)

    setStatsReal({
      ventas:   totalVentas,
      caja:     cajaInicial + ventasEfectivo - gastosCaja,
      cargando: false,
    })
  }

  useEffect(() => { cargarStats() }, [])

  const cargarMesas = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('mesas')
      .select(`
        *,
        cuentas(
          id, mesa_id, cliente_id, estado, hora_apertura,
          subtotal_productos,
          clientes(nombre)
        )
      `)
      .order('numero', { ascending: true })
    if (!error && data) setMesas(data)
    setCargando(false)
  }

  const abrirModal  = (mesa) => setModalMesa(mesa)
  const cerrarModal = () => setModalMesa(null)

  const confirmarInicio = async (mesa, cliente) => {
    const ahora     = new Date()
    const offsetMs  = ahora.getTimezoneOffset() * 60000
    const horaLocal = new Date(ahora.getTime() - offsetMs).toISOString().slice(0, -1) + '-05:00'
    const { data: sesion } = await supabase.auth.getSession()
    const adminId = sesion?.session?.user?.id

    await supabase.from('mesas').update({ en_uso: true, hora_inicio: horaLocal }).eq('id', mesa.id)
    await supabase.from('cuentas').insert({
      mesa_id: mesa.id, cliente_id: cliente?.id ?? null,
      admin_id: adminId, hora_apertura: horaLocal, estado: 'abierta',
    })
    cerrarModal()
    cargarMesas()
  }

  const handleCrearNuevaCuenta = async (cliente) => {
    const { data: sesion } = await supabase.auth.getSession()
    const adminId = sesion?.session?.user?.id
    const ahora     = new Date()
    const offsetMs  = ahora.getTimezoneOffset() * 60000
    const horaLocal = new Date(ahora.getTime() - offsetMs).toISOString().slice(0, -1) + '-05:00'

    const { data: nuevaCuenta, error } = await supabase
      .from('cuentas')
      .insert({
        mesa_id: null, cliente_id: cliente?.id ?? null,
        admin_id: adminId, hora_apertura: horaLocal,
        estado: 'abierta', subtotal_productos: 0,
      })
      .select('*, mesas(*), clientes(*)')
      .single()

    if (error || !nuevaCuenta) return
    setMostrarModalNC(false)
    setLiquidarDirecto(false)
    setCuentaConsumo(nuevaCuenta)
  }

  const buildCuenta = (mesa) => {
    const cuentaAbierta = mesa.cuentas?.find(c => c.estado === 'abierta')
    if (!cuentaAbierta) return null
    return {
      ...cuentaAbierta,
      mesa_id: mesa.id,
      mesas: { id: mesa.id, numero: mesa.numero, tipo: mesa.tipo, precio_minuto: mesa.precio_minuto },
    }
  }

  const abrirConsumo  = (mesa) => { const c = buildCuenta(mesa); if (!c) return; setLiquidarDirecto(false); setCuentaConsumo(c) }
  const abrirLiquidar = (mesa) => { const c = buildCuenta(mesa); if (!c) return; setLiquidarDirecto(true);  setCuentaConsumo(c) }

  useEffect(() => {
    let activo = true
    setCargando(true)
    supabase.auth.getSession().then(() => {
      supabase.from('mesas')
        .select(`*, cuentas(id, mesa_id, cliente_id, estado, hora_apertura, subtotal_productos, clientes(nombre))`)
        .order('numero', { ascending: true })
        .then(({ data, error }) => {
          if (!error && activo && data) setMesas(data)
          if (activo) setCargando(false)
        })
    })
    const canal = supabase.channel('mesas-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => { if (activo) cargarMesas() })
      .subscribe()
    return () => { activo = false; supabase.removeChannel(canal) }
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  if (cuentaConsumo) {
    return (
      <ConsumoMesa
        cuenta={cuentaConsumo}
        irALiquidar={liquidarDirecto}
        onVolver={() => { setCuentaConsumo(null); setLiquidarDirecto(false); cargarMesas() }}
      />
    )
  }

  const tiposFiltro    = ['Todo', '3 Bandas', 'Pool', 'Libre', 'Bolirana', 'Mano de Cartas']
  const mesasFiltradas = filtro === 'Todo' ? mesas : mesas.filter(m => m.tipo === filtro)
  const mesasActivas   = mesas.filter(m => m.en_uso).length
  const clienteNombre  = (mesa) => mesa.cuentas?.find(c => c.estado === 'abierta')?.clientes?.nombre ?? null

  return (
    <div className="da-root">

      {modalMesa && (
        <ModalIniciarMesa mesa={modalMesa} onConfirmar={confirmarInicio} onCancelar={cerrarModal} />
      )}
      {mostrarModalNC && (
        <ModalNuevaCuenta onConfirmar={handleCrearNuevaCuenta} onCancelar={() => setMostrarModalNC(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className="da-sidebar">
        <div className="da-sidebar-logo">
          <span className="material-icons-outlined da-sidebar-icon">sports_esports</span>
          <div>
            <h1 className="da-sidebar-title">Club de Billar</h1>
            <span className="da-sidebar-script">Sabana</span>
          </div>
        </div>

        <nav className="da-nav">
          <a href="#" className="da-nav-item da-nav-active">
            <span className="material-icons-outlined">dashboard</span>Dashboard
          </a>
          <a href="#" className="da-nav-item" onClick={e => { e.preventDefault(); onNavegar('inventario') }}>
            <span className="material-icons-outlined">inventory_2</span>Inventario
          </a>
          <a href="#" className="da-nav-item" onClick={e => { e.preventDefault(); onNavegar('cuentas') }}>
            <span className="material-icons-outlined">receipt_long</span>Cuentas
          </a>
          <a href="#" className="da-nav-item">
            <span className="material-icons-outlined">bar_chart</span>Reportes
          </a>
          <a href="#" className="da-nav-item" onClick={e => { e.preventDefault(); onNavegar('clientes') }}>
            <span className="material-icons-outlined">people</span>Clientes
          </a>

        </nav>

        <div className="da-sidebar-footer">
          <button className="da-user-btn" onClick={() => onNavegar('configadmin')}>
            <div className="da-user-avatar">
              {userInfo.email ? userInfo.email[0].toUpperCase() : '?'}
            </div>
            <div className="da-user-info">
              <p className="da-user-name">{userInfo.email || 'Cargando...'}</p>
              <p className="da-user-role">{userInfo.role}</p>
            </div>
            <span className="material-icons-outlined">settings</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="da-main">
        <header className="da-mobile-header">
          <span className="da-mobile-script">Sabana</span>
          <button><span className="material-icons-outlined">menu</span></button>
        </header>

        <div className="da-content">
          <div className="da-topbar">
            <div>
              <h2 className="da-page-title">Panel Principal</h2>
              <p className="da-page-sub">Bienvenido de nuevo, resumen de actividad en tiempo real.</p>
            </div>
            <div className="da-topbar-actions">
              <button className="da-btn-secondary" onClick={cargarMesas}>
                <span className="material-icons-outlined">refresh</span> Actualizar
              </button>
              <button className="da-btn-primary" onClick={() => setMostrarModalNC(true)}>
                <span className="material-icons-outlined">add</span> Nueva Cuenta
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="da-stats">
            <div className="da-stat-card">
              <div className="da-stat-bar" style={{ background: '#3B82F6' }}></div>
              <div className="da-stat-top">
                <div>
                  <p className="da-stat-label">Mesas Activas</p>
                  <h3 className="da-stat-value">
                    {mesasActivas}<span className="da-stat-total">/{mesas.length}</span>
                  </h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  <span className="material-icons-outlined">table_restaurant</span>
                </div>
              </div>
              <div className="da-progress-bar">
                <div style={{
                  width: mesas.length ? `${(mesasActivas / mesas.length) * 100}%` : '0%',
                  background: '#3B82F6'
                }}></div>
              </div>
            </div>

            <div className="da-stat-card">
              <div className="da-stat-bar" style={{ background: '#10B981' }}></div>
              <div className="da-stat-top">
                <div>
                  <p className="da-stat-label">Ventas Hoy</p>
                  <h3 className="da-stat-value">{statsReal.cargando ? '—' : formatCOP(statsReal.ventas)}</h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                  <span className="material-icons-outlined">payments</span>
                </div>
              </div>
            </div>

            <div className="da-stat-card">
              <div className="da-stat-bar" style={{ background: '#F59E0B' }}></div>
              <div className="da-stat-top">
                <div>
                  <p className="da-stat-label">Ctas. Abiertas</p>
                  <h3 className="da-stat-value">{mesasActivas}</h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
                  <span className="material-icons-outlined">receipt</span>
                </div>
              </div>
              <p className="da-stat-hint">Mesas en uso ahora</p>
            </div>

            <div className="da-stat-card">
              <div className="da-stat-bar" style={{ background: '#8B5CF6' }}></div>
              <div className="da-stat-top">
                <div>
                  <p className="da-stat-label">Caja Actual</p>
                  <h3 className="da-stat-value">{statsReal.cargando ? '—' : formatCOP(statsReal.caja)}</h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                  <span className="material-icons-outlined">point_of_sale</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="da-filters">
            <div className="da-filter-pills">
              {tiposFiltro.map(f => (
                <button
                  key={f}
                  className={`da-pill ${filtro === f ? 'da-pill-active' : ''}`}
                  onClick={() => setFiltro(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="da-legend">
              <div className="da-legend-item"><span className="da-dot da-dot-green"></span> Ocupado</div>
              <div className="da-legend-item"><span className="da-dot da-dot-gray"></span> Disponible</div>
            </div>
          </div>

          {/* Grid mesas */}
          <div className="da-mesas-grid">
            {cargando ? (
              <p style={{ color: '#9ca3af', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                Cargando mesas...
              </p>
            ) : mesasFiltradas.length === 0 ? (
              <p style={{ color: '#9ca3af', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
                No hay mesas para mostrar.
              </p>
            ) : mesasFiltradas.map(mesa => {
              const color     = colorTipo[mesa.tipo] || 'gray'
              const ocupada   = mesa.en_uso
              const segundos  = ocupada ? calcularSegundos(mesa.hora_inicio) : 0
              const tiempoStr = ocupada ? segundosAFormato(segundos) : null
              const valorStr  = ocupada ? calcularValor(mesa.hora_inicio, mesa.precio_minuto) : null
              const nombre    = clienteNombre(mesa)

              return (
                <div key={mesa.id} className={`da-mesa-card da-mesa-${ocupada ? color : 'gray'}`}>
                  <div className={`da-mesa-top-bar da-bar-${ocupada ? color : 'gray'}`}></div>
                  <div className="da-mesa-body">
                    <div className="da-mesa-header">
                      <span className={`da-mesa-num da-num-${ocupada ? color : 'gray'}`}>
                        {String(mesa.numero).padStart(2, '0')}
                      </span>
                      <span className={`da-mesa-tipo da-tipo-${ocupada ? color : 'gray'}`}>{mesa.tipo}</span>
                    </div>

                    {ocupada ? (
                      <div className="da-mesa-tiempo">
                        <h4 className="da-mesa-reloj">{tiempoStr}</h4>
                        <p className="da-mesa-tiempo-label">Tiempo transcurrido</p>
                        {nombre && <p className="da-mesa-cliente">👤 {nombre}</p>}
                      </div>
                    ) : (
                      <div className="da-mesa-vacia">
                        <span className="material-icons-outlined da-mesa-play-icon">play_circle_outline</span>
                        <p>Iniciar Mesa</p>
                      </div>
                    )}

                    <div className="da-mesa-footer">
                      <div className="da-mesa-estado">
                        <span className={`da-dot ${ocupada ? 'da-dot-green da-dot-pulse' : 'da-dot-gray'}`}></span>
                        <span>{ocupada ? 'Ocupada' : 'Disponible'}</span>
                      </div>
                      <span className="da-mesa-valor">{valorStr ?? '--'}</span>
                    </div>
                  </div>

                  <div className="da-mesa-overlay">
                    {ocupada ? (
                      <>
                        <button className="da-overlay-btn da-overlay-gold" title="Agregar consumo" onClick={() => abrirConsumo(mesa)}>
                          <span className="material-icons-outlined">local_bar</span>
                        </button>
                        <button className="da-overlay-btn da-overlay-red" title="Liquidar cuenta" onClick={() => abrirLiquidar(mesa)}>
                          <span className="material-icons-outlined">stop_circle</span>
                        </button>
                      </>
                    ) : (
                      <button className="da-overlay-btn-wide da-overlay-green" onClick={() => abrirModal(mesa)}>
                        <span className="material-icons-outlined">play_arrow</span> Iniciar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="da-footer-text">
            © 2026 Club de Billar Sabana. Panel de Administración v2.0
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardAdmin
