import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './VerificacionTurno.css'

function VerificacionTurno({ onTurnoIniciado }) {
  const [base, setBase] = useState('150.000')
  const [loading, setLoading] = useState(false)
  const [hora, setHora] = useState('')

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setHora(ahora.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }))
    }
    actualizar()
    const intervalo = setInterval(actualizar, 1000)
    return () => clearInterval(intervalo)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Aquí después guardamos en Supabase
    setLoading(false)
    onTurnoIniciado()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      <div className="vt-bg-overlay">
        <img
          alt="Billiard balls background"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNV2xLGGBmJ4nCVyIlhGcC-izaQ0xItM2Ik8FV7FYdm3DdU4dmMXhMy2i9ixOYt28aoZmbaiwT1PaBFyXbENhAQGEDxW1VWFkhvHMHeKZvtRbznVM4gknxgvt2bepEFQDSNhaF_oKq8L6rnbslSDRTMpfCpERWfUtxFkWe-H0ie3buhfRztifATlctUzuxC6NFpDv5_SILQuaOFwFu9a1vd5mFpUdq8xbML3xNNLNQrEHdpKcko9487ORg0dUMqkPE1HVoWukPFeJ6"
        />
        <div className="vt-bg-grad"></div>
      </div>

      <div className="vt-dashboard-blur">
        <header className="vt-dash-header">
          <div className="vt-dash-header-left">
            <span className="material-icons vt-dash-icon">sports_esports</span>
            <h1>Club Sabana</h1>
          </div>
          <div className="vt-dash-avatar"></div>
        </header>
        <main className="vt-dash-main">
          <div className="vt-dash-card"></div>
          <div className="vt-dash-card"></div>
          <div className="vt-dash-card"></div>
          <div className="vt-dash-card vt-dash-card-wide"></div>
          <div className="vt-dash-card vt-dash-card-tall"></div>
        </main>
      </div>

      <div className="vt-modal-overlay">
        <div className="vt-modal">
          <div className="vt-modal-header">
            <div className="vt-modal-logo">
              <span className="material-icons vt-modal-logo-icon">sports_bar</span>
              <div className="vt-modal-logo-dot"></div>
            </div>
            <h2 className="vt-modal-title">
              Club de Billar <span>Sabana</span>
            </h2>
            <p className="vt-modal-subtitle">Portal de Empleados</p>
          </div>

          <div className="vt-modal-body">
            <div className="vt-modal-intro">
              <h3>Abrir Nuevo Turno</h3>
              <p>Ingresa la base para comenzar a operar.</p>
            </div>

            <div className="vt-clock">
              <span className="material-icons vt-clock-icon">schedule</span>
              <span>Hora del Servidor: <strong>{hora}</strong></span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="vt-form-group">
                <label className="vt-label" htmlFor="base">
                  Base de Caja Inicial
                </label>
                <div className="vt-input-wrapper">
                  <span className="vt-input-prefix">$</span>
                  <input
                    className="vt-input"
                    id="base"
                    name="base"
                    type="text"
                    placeholder="0.00"
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                  />
                  <span className="vt-input-suffix">COP</span>
                </div>
                <p className="vt-input-hint">* Verifica el dinero físico en caja antes de confirmar.</p>
              </div>

              <button
                className="vt-btn-primary"
                type="submit"
                disabled={loading}
              >
                <span className="material-icons">lock_open</span>
                <span>{loading ? 'Iniciando...' : 'Iniciar Turno'}</span>
              </button>
            </form>

            <button className="vt-logout" onClick={handleLogout}>
              <span className="material-icons">logout</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default VerificacionTurno
