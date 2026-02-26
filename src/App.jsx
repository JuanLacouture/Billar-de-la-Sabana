import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import VerificacionTurno from './pages/VerificacionTurno'

function App() {
  const [session, setSession] = useState(null)
  const [rol, setRol] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session)
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setRol(data?.role ?? null)
      } else {
        setSession(null)
        setRol(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Login />
  if (rol === 'admin') return <VerificacionTurno />
  return null
}

export default App
