import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './DashboardAdmin.css'

const colorTipo = {
  '3 Bandas':      'blue',
  'Pool':          'green',
  'Mano de Cartas':'red',
  'Libre':         'purple',
  'Bolirana':      'orange',
}

function segundosAFormato(seg) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function calcularSegundos(horaInicio) {
  if (!horaInicio) return 0
  const inicio = new Date(horaInicio)
  const ahora = new Date()
  return Math.floor((ahora - inicio) / 1000)
}

function calcularValor(horaInicio, precioMinuto) {
  const seg = calcularSegundos(horaInicio)
  const minutos = seg / 60
  const total = minutos * precioMinuto
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(total)
}

function DashboardAdmin() {
  const [mesas, setMesas] = useState([])
  const [filtro, setFiltro] = useState('Todo')
  const [, setTick] = useState(0)

  // Carga manual (botón Actualizar)
  const cargarMesas = async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('numero', { ascending: true })
    if (!error) setMesas(data)
  }

  // Carga inicial + suscripción realtime
  useEffect(() => {
    let activo = true

    // Carga inicial en callback, no síncrona
    supabase
      .from('mesas')
      .select('*')
      .order('numero', { ascending: true })
      .then(({ data, error }) => {
        if (!error && activo) setMesas(data)
      })

    // Suscripción realtime — actualiza solo la fila que cambió
    const canal = supabase
      .channel('mesas-cambios')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mesas' },
        (payload) => {
          if (!activo) return
          if (payload.eventType === 'UPDATE') {
            setMesas(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
          } else if (payload.eventType === 'INSERT') {
            setMesas(prev => [...prev, payload.new].sort((a, b) => a.numero - b.numero))
          } else if (payload.eventType === 'DELETE') {
            setMesas(prev => prev.filter(m => m.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      activo = false
      supabase.removeChannel(canal)
    }
  }, [])

  // Timer cada segundo para relojes en vivo
  useEffect(() => {
    const intervalo = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const tiposFiltro = ['Todo', '3 Bandas', 'Pool', 'Libre', 'Bolirana', 'Mano de Cartas']

  const mesasFiltradas = filtro === 'Todo'
    ? mesas
    : mesas.filter(m => m.tipo === filtro)

  const mesasActivas = mesas.filter(m => m.en_uso).length

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="da-root">
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
            <span className="material-icons-outlined">dashboard</span>
            Dashboard
          </a>
          <a href="#" className="da-nav-item">
            <span className="material-icons-outlined">inventory_2</span>
            Inventario
          </a>
          <a href="#" className="da-nav-item">
            <span className="material-icons-outlined">receipt_long</span>
            Cuentas
          </a>
          <a href="#" className="da-nav-item">
            <span className="material-icons-outlined">bar_chart</span>
            Reportes
          </a>
          <a href="#" className="da-nav-item">
            <span className="material-icons-outlined">people</span>
            Clientes
          </a>
        </nav>

        <div className="da-sidebar-footer">
          <button className="da-user-btn" onClick={handleLogout}>
            <div className="da-user-avatar">A</div>
            <div className="da-user-info">
              <p className="da-user-name">Admin</p>
              <p className="da-user-role">Gerente</p>
            </div>
            <span className="material-icons-outlined">settings</span>
          </button>
        </div>
      </aside>

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
              <button className="da-btn-primary">
                <span className="material-icons-outlined">add</span> Nueva Mesa
              </button>
            </div>
          </div>

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
                  <h3 className="da-stat-value">$1.2M</h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                  <span className="material-icons-outlined">payments</span>
                </div>
              </div>
              <p className="da-stat-trend">
                <span className="material-icons-outlined">trending_up</span> +12% vs ayer
              </p>
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
                  <h3 className="da-stat-value">$450k</h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                  <span className="material-icons-outlined">point_of_sale</span>
                </div>
              </div>
              <p className="da-stat-hint">Cierre programado: 02:00 AM</p>
            </div>
          </div>

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
              <div className="da-legend-item">
                <span className="da-dot da-dot-green"></span> Ocupado
              </div>
              <div className="da-legend-item">
                <span className="da-dot da-dot-gray"></span> Disponible
              </div>
            </div>
          </div>

          <div className="da-mesas-grid">
            {mesasFiltradas.map(mesa => {
              const color = colorTipo[mesa.tipo] || 'gray'
              const ocupada = mesa.en_uso
              const segundos = ocupada ? calcularSegundos(mesa.hora_inicio) : 0
              const tiempoStr = ocupada ? segundosAFormato(segundos) : null
              const valorStr = ocupada ? calcularValor(mesa.hora_inicio, mesa.precio_minuto) : null

              return (
                <div key={mesa.id} className={`da-mesa-card da-mesa-${ocupada ? color : 'gray'}`}>
                  <div className={`da-mesa-top-bar da-bar-${ocupada ? color : 'gray'}`}></div>
                  <div className="da-mesa-body">
                    <div className="da-mesa-header">
                      <span className={`da-mesa-num da-num-${ocupada ? color : 'gray'}`}>
                        {String(mesa.numero).padStart(2, '0')}
                      </span>
                      <span className={`da-mesa-tipo da-tipo-${ocupada ? color : 'gray'}`}>
                        {mesa.tipo}
                      </span>
                    </div>

                    {ocupada ? (
                      <div className="da-mesa-tiempo">
                        <h4 className="da-mesa-reloj">{tiempoStr}</h4>
                        <p className="da-mesa-tiempo-label">Tiempo transcurrido</p>
                        {mesa.cliente_nombre && (
                          <p className="da-mesa-cliente">👤 {mesa.cliente_nombre}</p>
                        )}
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
                        <button className="da-overlay-btn da-overlay-gold" title="Agregar consumo">
                          <span className="material-icons-outlined">local_bar</span>
                        </button>
                        <button className="da-overlay-btn da-overlay-red" title="Cerrar mesa">
                          <span className="material-icons-outlined">stop_circle</span>
                        </button>
                      </>
                    ) : (
                      <button className="da-overlay-btn-wide da-overlay-green">
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
