import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './DashboardAdmin.css'

const mesasIniciales = [
  { id: 1, tipo: 'Tres Bandas', estado: 'ocupada', tiempo: '01:45:22', valor: '$32.000' },
  { id: 2, tipo: 'Pool', estado: 'ocupada', tiempo: '00:23:15', valor: '$8.500' },
  { id: 3, tipo: 'Tres Bandas', estado: 'disponible', tiempo: null, valor: null },
  { id: 4, tipo: 'Pool', estado: 'ocupada', tiempo: '02:10:05', valor: '$45.000' },
  { id: 5, tipo: 'Cartas', estado: 'ocupada', tiempo: '03:45:00', valor: '$65.500' },
  { id: 6, tipo: 'Tres Bandas', estado: 'disponible', tiempo: null, valor: null },
  { id: 7, tipo: 'Tres Bandas', estado: 'ocupada', tiempo: '00:05:32', valor: '$2.500' },
  { id: 8, tipo: 'Pool', estado: 'disponible', tiempo: null, valor: null },
  { id: 9, tipo: 'Tres Bandas', estado: 'ocupada', tiempo: '00:55:10', valor: '$15.500' },
  { id: 10, tipo: 'Tres Bandas', estado: 'disponible', tiempo: null, valor: null },
  { id: 11, tipo: 'Tres Bandas', estado: 'ocupada', tiempo: '01:12:45', valor: '$21.800' },
  { id: 12, tipo: 'Pool', estado: 'ocupada', tiempo: '00:44:20', valor: '$12.000' },
]

const colorTipo = {
  'Tres Bandas': 'blue',
  'Pool': 'green',
  'Cartas': 'red',
}

function DashboardAdmin() {
  const [mesas] = useState(mesasIniciales)
  const [filtro, setFiltro] = useState('Todo')

  const mesasFiltradas = filtro === 'Todo'
    ? mesas
    : mesas.filter(m => m.tipo === filtro)

  const mesasActivas = mesas.filter(m => m.estado === 'ocupada').length

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="da-root">

      {/* Sidebar */}
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

      {/* Main */}
      <main className="da-main">

        {/* Header móvil */}
        <header className="da-mobile-header">
          <span className="da-mobile-script">Sabana</span>
          <button><span className="material-icons-outlined">menu</span></button>
        </header>

        <div className="da-content">

          {/* Título */}
          <div className="da-topbar">
            <div>
              <h2 className="da-page-title">Panel Principal</h2>
              <p className="da-page-sub">Bienvenido de nuevo, resumen de actividad en tiempo real.</p>
            </div>
            <div className="da-topbar-actions">
              <button className="da-btn-secondary">
                <span className="material-icons-outlined">refresh</span> Actualizar
              </button>
              <button className="da-btn-primary">
                <span className="material-icons-outlined">add</span> Nueva Mesa
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
                  <h3 className="da-stat-value">{mesasActivas}<span className="da-stat-total">/{mesas.length}</span></h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                  <span className="material-icons-outlined">table_restaurant</span>
                </div>
              </div>
              <div className="da-progress-bar">
                <div style={{ width: `${(mesasActivas / mesas.length) * 100}%`, background: '#3B82F6' }}></div>
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
                  <h3 className="da-stat-value">8</h3>
                </div>
                <div className="da-stat-icon" style={{ background: '#FFFBEB', color: '#F59E0B' }}>
                  <span className="material-icons-outlined">receipt</span>
                </div>
              </div>
              <p className="da-stat-hint">Promedio $45k por cuenta</p>
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

          {/* Filtros */}
          <div className="da-filters">
            <div className="da-filter-pills">
              {['Todo', 'Tres Bandas', 'Pool', 'Cartas'].map(f => (
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

          {/* Grid de mesas */}
          <div className="da-mesas-grid">
            {mesasFiltradas.map(mesa => {
              const color = colorTipo[mesa.tipo] || 'gray'
              const ocupada = mesa.estado === 'ocupada'
              return (
                <div key={mesa.id} className={`da-mesa-card da-mesa-${ocupada ? color : 'gray'}`}>
                  <div className={`da-mesa-top-bar da-bar-${ocupada ? color : 'gray'}`}></div>
                  <div className="da-mesa-body">
                    <div className="da-mesa-header">
                      <span className={`da-mesa-num da-num-${ocupada ? color : 'gray'}`}>
                        {String(mesa.id).padStart(2, '0')}
                      </span>
                      <span className={`da-mesa-tipo da-tipo-${ocupada ? color : 'gray'}`}>
                        {mesa.tipo}
                      </span>
                    </div>

                    {ocupada ? (
                      <div className="da-mesa-tiempo">
                        <h4 className="da-mesa-reloj">{mesa.tiempo}</h4>
                        <p className="da-mesa-tiempo-label">Tiempo transcurrido</p>
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
                      <span className="da-mesa-valor">{mesa.valor ?? '--'}</span>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className="da-mesa-overlay">
                    {ocupada ? (
                      <>
                        <button className="da-overlay-btn da-overlay-gold">
                          <span className="material-icons-outlined">local_bar</span>
                        </button>
                        <button className="da-overlay-btn da-overlay-red">
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
