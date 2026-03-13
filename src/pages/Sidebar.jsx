import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const NAV_ITEMS = [
  { key: 'dashboard',   label: 'Dashboard',   icon: 'dashboard' },
  { key: 'Inventario',  label: 'Inventario',  icon: 'inventory_2' },
  { key: 'cuentas',     label: 'Cuentas',     icon: 'receipt_long' },
  { key: 'reportes',    label: 'Reportes',    icon: 'bar_chart' },
  { key: 'clientes',    label: 'Clientes',    icon: 'people' },
]

function Sidebar({ paginaActual, onNavegar }) {
  const [userInfo, setUserInfo] = useState({ email: '', role: '' })

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setUserInfo({ email: user.email ?? '', role: profile?.role ?? 'Usuario' })
    }
    cargar()
  }, [])

  return (
    <aside className="da-sidebar">
      <div className="da-sidebar-logo">
        <span className="material-icons-outlined da-sidebar-icon">sports_esports</span>
        <div>
          <h1 className="da-sidebar-title">Club de Billar</h1>
          <span className="da-sidebar-script">Sabana</span>
        </div>
      </div>

      <nav className="da-nav">
        {NAV_ITEMS.map(item => (
          <a
            key={item.key}
            href="#"
            className={`da-nav-item ${paginaActual === item.key ? 'da-nav-active' : ''}`}
            onClick={e => { e.preventDefault(); onNavegar(item.key) }}
          >
            <span className="material-icons-outlined">{item.icon}</span>
            {item.label}
          </a>
        ))}
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
  )
}

export default Sidebar
