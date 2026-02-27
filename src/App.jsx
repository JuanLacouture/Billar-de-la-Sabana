import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import VerificacionTurno from './pages/VerificacionTurno'
import DashboardAdmin from './pages/DashboardAdmin'

function App() {
  const [session, setSession] = useState(null)
  const [rol, setRol] = useState(
    () => localStorage.getItem('rol') // ← persiste entre recargas
  )
  const [turnoIniciado, setTurnoIniciado] = useState(
    () => localStorage.getItem('turno_iniciado') === 'true' // ← persiste entre recargas
  )

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session)
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        const rolObtenido = data?.role ?? null
        setRol(rolObtenido)
        localStorage.setItem('rol', rolObtenido) // ← guarda el rol
      } else {
        setSession(null)
        setRol(null)
        setTurnoIniciado(false)
        localStorage.removeItem('rol')           // ← limpia al cerrar sesión
        localStorage.removeItem('turno_iniciado')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleTurnoIniciado = () => {
    localStorage.setItem('turno_iniciado', 'true') // ← guarda el turno
    setTurnoIniciado(true)
  }

  if (!session) return <Login />
  if (rol === 'admin' && !turnoIniciado) return <VerificacionTurno onTurnoIniciado={handleTurnoIniciado} />
  if (rol === 'admin' && turnoIniciado) return <DashboardAdmin />
  return null
}

export default App
