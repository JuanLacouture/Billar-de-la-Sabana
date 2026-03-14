import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './VerificacionTurno.css'


function VerificacionTurno({ onTurnoIniciado }) {
  const [base, setBase]               = useState('150000')
  const [loading, setLoading]         = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [cajaAbierta, setCajaAbierta] = useState(false)
  const [cajaId, setCajaId]           = useState(null)
  const [hora, setHora]               = useState('')
  const [error, setError]             = useState(null)


  // ── Reloj ──
  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setHora(ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }
    actualizar()
    const iv = setInterval(actualizar, 1000)
    return () => clearInterval(iv)
  }, [])


  // ── Verificar estado ──
  useEffect(() => {
    const verificar = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      // Nivel 0: ¿yo ya tengo turno abierto? → dashboard directo
      if (user) {
        const { data: turnoPropio } = await supabase
          .from('turnos')
          .select('id')
          .eq('admin_id', user.id)
          .is('hora_fin', null)
          .limit(1)

        if (turnoPropio && turnoPropio.length > 0) {
          onTurnoIniciado()
          return
        }
      }

      // Nivel 1: ¿hay una caja abierta hoy?
      const { data: cajaData } = await supabase
        .from('caja')
        .select('id')
        .eq('is_open', true)
        .limit(1)
        .maybeSingle()

      if (cajaData) {
        setCajaAbierta(true)
        setCajaId(cajaData.id)
      } else {
        setCajaAbierta(false)
        setCajaId(null)
      }
      setVerificando(false)
    }
    verificar()
  }, [])


  // ── Abrir turno ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No hay sesión activa.'); setLoading(false); return }

    let idCaja = cajaId

    // Si no hay caja abierta → crearla primero
    if (!cajaAbierta) {
      const montoBase = parseFloat(String(base).replace(/[^0-9.]/g, '')) || 0
      const { data: nuevaCaja, error: errCaja } = await supabase
        .from('caja')
        .insert({ caja_inicial: montoBase, is_open: true })
        .select('id')
        .single()

      if (errCaja) { setError(errCaja.message); setLoading(false); return }
      idCaja = nuevaCaja.id
    }

    // Crear el turno vinculado a la caja
    const { error: errTurno } = await supabase
      .from('turnos')
      .insert({
        admin_id:    user.id,
        hora_inicio: new Date().toISOString(),
        caja_id:     idCaja,
      })

    setLoading(false)
    if (errTurno) { setError(errTurno.message); return }
    onTurnoIniciado()
  }


  const handleLogout = async () => { await supabase.auth.signOut() }


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
            <h2 className="vt-modal-title">Club de Billar <span>Sabana</span></h2>
            <p className="vt-modal-subtitle">Portal de Empleados</p>
          </div>

          <div className="vt-modal-body">

            {verificando ? (
              <div className="vt-verificando">
                <span className="material-icons vt-spin">autorenew</span>
                <p>Verificando estado de caja...</p>
              </div>
            ) : (
              <>
                <div className="vt-modal-intro">
                  <h3>{cajaAbierta ? 'Unirse al Turno Activo' : 'Abrir Nuevo Turno'}</h3>
                  <p>
                    {cajaAbierta
                      ? 'La caja ya está abierta. Tu turno será registrado sin base inicial.'
                      : 'No hay caja abierta. Ingresa la base para comenzar a operar.'}
                  </p>
                </div>

                <div className={`vt-caja-badge ${cajaAbierta ? 'vt-caja-abierta' : 'vt-caja-cerrada'}`}>
                  <span className="material-icons">{cajaAbierta ? 'lock_open' : 'lock'}</span>
                  <span>{cajaAbierta ? 'Caja actualmente abierta' : 'Caja cerrada — primer turno del día'}</span>
                </div>

                <div className="vt-clock">
                  <span className="material-icons vt-clock-icon">schedule</span>
                  <span>Hora: <strong>{hora}</strong></span>
                </div>

                {error && (
                  <div className="vt-error">
                    <span className="material-icons">error_outline</span>{error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {!cajaAbierta && (
                    <div className="vt-form-group">
                      <label className="vt-label" htmlFor="base">Base de Caja Inicial</label>
                      <div className="vt-input-wrapper">
                        <span className="vt-input-prefix">$</span>
                        <input
                          className="vt-input"
                          id="base"
                          type="text"
                          placeholder="0"
                          value={base}
                          onChange={e => setBase(e.target.value)}
                        />
                        <span className="vt-input-suffix">COP</span>
                      </div>
                      <p className="vt-input-hint">* Verifica el dinero físico en caja antes de confirmar.</p>
                    </div>
                  )}

                  <button className="vt-btn-primary" type="submit" disabled={loading}>
                    <span className="material-icons">{loading ? 'hourglass_top' : 'lock_open'}</span>
                    <span>{loading ? 'Iniciando...' : 'Iniciar Turno'}</span>
                  </button>
                </form>

                <button className="vt-logout" onClick={handleLogout}>
                  <span className="material-icons">logout</span>
                  <span>Cerrar sesión</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default VerificacionTurno
