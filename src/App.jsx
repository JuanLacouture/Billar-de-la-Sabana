import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import VerificacionTurno from './pages/VerificacionTurno'
import DashboardAdmin from './pages/DashboardAdmin'
import Cuentas from './pages/Cuentas'
import Clientes from './pages/Clientes'
import Inventario from './pages/Inventario'
import ConfigAdmin from './pages/ConfigAdmin'


function App() {
  const [session, setSession] = useState(null)
  const [rol, setRol] = useState(() => sessionStorage.getItem('rol'))
  const [turnoIniciado, setTurnoIniciado] = useState(
    () => sessionStorage.getItem('turno_iniciado') === 'true'
  )
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [pagina, setPagina] = useState('dashboard')


  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session)
        const rolGuardado = sessionStorage.getItem('rol')
        if (rolGuardado) {
          setRol(rolGuardado)
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          const rolObtenido = data?.role ?? null
          setRol(rolObtenido)
          sessionStorage.setItem('rol', rolObtenido)
        }
      }
      setCargandoSesion(false)
    })


    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session)
        const rolGuardado = sessionStorage.getItem('rol')
        if (rolGuardado) {
          setRol(rolGuardado)
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          const rolObtenido = data?.role ?? null
          setRol(rolObtenido)
          sessionStorage.setItem('rol', rolObtenido)
        }
      } else {
        setSession(null)
        setRol(null)
        setTurnoIniciado(false)
        setPagina('dashboard')
        sessionStorage.removeItem('rol')
        sessionStorage.removeItem('turno_iniciado')
      }
    })


    return () => subscription.unsubscribe()
  }, [])


  const handleTurnoIniciado = () => {
    sessionStorage.setItem('turno_iniciado', 'true')
    setTurnoIniciado(true)
  }


  if (cargandoSesion) return null
  if (!session)      return <Login />
  if (rol === 'admin' && !turnoIniciado)
    return <VerificacionTurno onTurnoIniciado={handleTurnoIniciado} />

  if (rol === 'admin' && turnoIniciado) {
    if (pagina === 'cuentas')      return <Cuentas      onNavegar={setPagina} />
    if (pagina === 'clientes')     return <Clientes     onNavegar={setPagina} />
    if (pagina === 'Inventario')   return <Inventario   onNavegar={setPagina} />
    if (pagina === 'configadmin')  return <ConfigAdmin  onNavegar={setPagina} />
    return <DashboardAdmin onNavegar={setPagina} />
  }


  return null
}


export default App
