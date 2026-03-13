import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import './Clientes.css'

// ── Helpers avatar ───────────────────────────────────────────────────
const avatarColors = [
  'linear-gradient(135deg, #3B82F6, #6366F1)',
  'linear-gradient(135deg, #EC4899, #F43F5E)',
  'linear-gradient(135deg, #10B981, #0D9488)',
  'linear-gradient(135deg, #F59E0B, #F97316)',
  'linear-gradient(135deg, #8B5CF6, #7C3AED)',
  'linear-gradient(135deg, #06B6D4, #0EA5E9)',
]

function getIniciales(nombre) {
  if (!nombre) return '?'
  const partes = nombre.trim().split(' ')
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function getAvatarColor(nombre) {
  if (!nombre) return avatarColors[0]
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash += nombre.charCodeAt(i)
  return avatarColors[hash % avatarColors.length]
}

// ── Modal Nuevo / Editar ─────────────────────────────────────────────
function ModalCliente({ cliente, onGuardar, onCancelar }) {
  const [nombre, setNombre]       = useState(cliente?.nombre   ?? '')
  const [telefono, setTelefono]   = useState(cliente?.telefono ?? '')
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores]     = useState({})

  const esEdicion = !!cliente

  const validar = () => {
    const nuevosErrores = {}
    const nombreLimpio = nombre.trim()

    if (!nombreLimpio) {
      nuevosErrores.nombre = 'El nombre es obligatorio.'
    } else if (nombreLimpio.length < 3) {
      nuevosErrores.nombre = 'El nombre debe tener al menos 3 caracteres.'
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/.test(nombreLimpio)) {
      nuevosErrores.nombre = 'El nombre solo puede contener letras y espacios.'
    }

    const telLimpio = telefono.replace(/\s/g, '')
    if (telLimpio && !/^3\d{9}$/.test(telLimpio)) {
      nuevosErrores.telefono = 'Debe iniciar con 3 y tener exactamente 10 dígitos.'
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleGuardar = async () => {
    if (!validar()) return
    setGuardando(true)
    await onGuardar({
      id: cliente?.id,
      nombre: nombre.trim(),
      telefono: telefono.replace(/\s/g, '')
    })
    setGuardando(false)
  }

  const handleTelefono = (e) => {
    const val = e.target.value.replace(/[^\d]/g, '')
    if (val.length <= 10) setTelefono(val)
  }

  return (
    <div className="cl-modal-backdrop" onClick={onCancelar}>
      <div className="cl-modal" onClick={e => e.stopPropagation()}>

        <div className="cl-modal-header">
          <div className="cl-modal-title-row">
            <span className="material-icons-outlined cl-modal-icon">person_add</span>
            <div>
              <h3 className="cl-modal-title">{esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <p className="cl-modal-sub">{esEdicion ? `Editando: ${cliente.nombre}` : 'Registra un nuevo cliente'}</p>
            </div>
          </div>
          <button className="cl-modal-close" onClick={onCancelar}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="cl-modal-body">
          <div className="cl-field">
            <label className="cl-label">
              <span className="material-icons-outlined">badge</span>Nombre completo
            </label>
            <input
              className={`cl-input ${errores.nombre ? 'cl-input-error' : ''}`}
              type="text"
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={e => {
                setNombre(e.target.value)
                if (errores.nombre) setErrores(prev => ({ ...prev, nombre: null }))
              }}
            />
            {errores.nombre && (
              <p className="cl-error">
                <span className="material-icons-outlined">error_outline</span>
                {errores.nombre}
              </p>
            )}
          </div>

          <div className="cl-field">
            <label className="cl-label">
              <span className="material-icons-outlined">phone</span>Teléfono
              <span className="cl-label-hint">(opcional)</span>
            </label>
            <div className="cl-tel-wrapper">
              <span className="cl-tel-prefix">+57</span>
              <input
                className={`cl-input cl-input-tel ${errores.telefono ? 'cl-input-error' : ''}`}
                type="tel"
                inputMode="numeric"
                placeholder="3XXXXXXXXX"
                value={telefono}
                onChange={e => {
                  handleTelefono(e)
                  if (errores.telefono) setErrores(prev => ({ ...prev, telefono: null }))
                }}
                maxLength={10}
              />
            </div>
            <p className={`cl-tel-count ${telefono.length === 10 ? 'cl-tel-ok' : ''}`}>
              {telefono.length}/10 dígitos
              {telefono.length === 10 && !errores.telefono
                ? ' ✓'
                : telefono.length > 0 && !telefono.startsWith('3')
                ? ' — debe iniciar con 3'
                : ''}
            </p>
            {errores.telefono && (
              <p className="cl-error">
                <span className="material-icons-outlined">error_outline</span>
                {errores.telefono}
              </p>
            )}
          </div>
        </div>

        <div className="cl-modal-footer">
          <button className="cl-btn-cancel" onClick={onCancelar}>Cancelar</button>
          <button className="cl-btn-confirm" onClick={handleGuardar} disabled={guardando}>
            <span className="material-icons-outlined">{esEdicion ? 'save' : 'person_add'}</span>
            {guardando ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Modal Eliminar ───────────────────────────────────────────────────
function ModalEliminar({ cliente, onConfirmar, onCancelar }) {
  const [eliminando, setEliminando] = useState(false)

  const handleEliminar = async () => {
    setEliminando(true)
    await onConfirmar(cliente.id)
    setEliminando(false)
  }

  return (
    <div className="cl-modal-backdrop" onClick={onCancelar}>
      <div className="cl-modal cl-modal-sm" onClick={e => e.stopPropagation()}>

        <div className="cl-modal-header">
          <div className="cl-modal-title-row">
            <span className="material-icons-outlined cl-modal-icon cl-icon-red">delete</span>
            <div>
              <h3 className="cl-modal-title">Eliminar Cliente</h3>
              <p className="cl-modal-sub">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button className="cl-modal-close" onClick={onCancelar}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="cl-modal-body">
          <p className="cl-delete-msg">
            ¿Estás seguro de que quieres eliminar a <strong>{cliente.nombre}</strong>?
          </p>
        </div>

        <div className="cl-modal-footer">
          <button className="cl-btn-cancel" onClick={onCancelar}>Cancelar</button>
          <button className="cl-btn-delete" onClick={handleEliminar} disabled={eliminando}>
            <span className="material-icons-outlined">delete</span>
            {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Vista principal ──────────────────────────────────────────────────
function Clientes({ onNavegar }) {
  const [clientes, setClientes]               = useState([])
  const [cargando, setCargando]               = useState(true)
  const [busqueda, setBusqueda]               = useState('')
  const [modalNuevo, setModalNuevo]           = useState(false)
  const [clienteEditar, setClienteEditar]     = useState(null)
  const [clienteEliminar, setClienteEliminar] = useState(null)
  const [paginaActual, setPaginaActual]       = useState(1)
  const POR_PAGINA = 10

  const cargarClientes = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true })
    if (!error && data) setClientes(data)
    setCargando(false)
  }

  useEffect(() => { cargarClientes() }, [])

  const handleLogout = async () => { await supabase.auth.signOut() }

  const handleGuardar = async ({ id, nombre, telefono }) => {
    if (id) {
      await supabase.from('clientes').update({ nombre, telefono }).eq('id', id)
    } else {
      await supabase.from('clientes').insert({ nombre, telefono })
    }
    setClienteEditar(null)
    setModalNuevo(false)
    cargarClientes()
  }

  const handleEliminar = async (id) => {
    await supabase.from('clientes').delete().eq('id', id)
    setClienteEliminar(null)
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter(c => {
    const nombre = c.nombre?.toLowerCase()   ?? ''
    const tel    = c.telefono?.toLowerCase() ?? ''
    const q      = busqueda.toLowerCase()
    return nombre.includes(q) || tel.includes(q)
  })

  const totalPaginas   = Math.max(1, Math.ceil(clientesFiltrados.length / POR_PAGINA))
  const paginaSegura   = Math.min(paginaActual, totalPaginas)
  const clientesPagina = clientesFiltrados.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA
  )

  // ── Imprimir / PDF ───────────────────────────────────────────────
  const handleExportar = () => {
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('Club de Billar Sabana', 14, 20)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text('Listado completo de clientes registrados', 14, 28)

    doc.setFontSize(9)
    const fecha = new Date().toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    doc.text(`Generado el: ${fecha}`, 14, 35)

    doc.setDrawColor(212, 175, 55)
    doc.setLineWidth(0.8)
    doc.line(14, 39, 196, 39)

    const datos = clientesFiltrados.map((c, i) => [
      i + 1,
      c.nombre ?? '—',
      c.telefono ? `+57 ${c.telefono}` : '—'
    ])

    autoTable(doc, {
      startY: 44,
      head: [['#', 'Nombre', 'Teléfono']],
      body: datos,
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: {
        fillColor: [212, 175, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 55 },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })

    const totalPags = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPags; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Club de Billar Sabana  •  Página ${i} de ${totalPags}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }

    // ← Abre en nueva pestaña y lanza diálogo de impresión
    const blob = doc.output('blob')
const url  = URL.createObjectURL(blob)

// Crea un iframe oculto, imprime desde él y lo destruye
const iframe = document.createElement('iframe')
iframe.style.display = 'none'
iframe.src = url
document.body.appendChild(iframe)
iframe.onload = () => {
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  // Limpia el iframe y la URL después de imprimir
  setTimeout(() => {
    document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
  }, 1000)
}

  }  // ← cierre correcto de handleExportar

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="cl-root">

      {(modalNuevo || clienteEditar) && (
        <ModalCliente
          cliente={clienteEditar}
          onGuardar={handleGuardar}
          onCancelar={() => { setModalNuevo(false); setClienteEditar(null) }}
        />
      )}
      {clienteEliminar && (
        <ModalEliminar
          cliente={clienteEliminar}
          onConfirmar={handleEliminar}
          onCancelar={() => setClienteEliminar(null)}
        />
      )}

      <aside className="cl-sidebar">
        <div className="cl-sidebar-logo">
          <span className="material-icons-outlined cl-sidebar-icon">sports_esports</span>
          <div>
            <h1 className="cl-sidebar-title">Club de Billar</h1>
            <span className="cl-sidebar-script">Sabana</span>
          </div>
        </div>

        <nav className="cl-nav">
          <a className="cl-nav-item" onClick={() => onNavegar('dashboard')}>
            <span className="material-icons-outlined">dashboard</span>Dashboard
          </a>
          <a href="#" className="da-nav-item" onClick={e => { e.preventDefault(); onNavegar('Inventario') }}>
            <span className="material-icons-outlined">inventory_2</span>Inventario
          </a>
          <a className="cl-nav-item" onClick={() => onNavegar('cuentas')}>
            <span className="material-icons-outlined">receipt_long</span>Cuentas
          </a>
          <a className="cl-nav-item">
            <span className="material-icons-outlined">bar_chart</span>Reportes
          </a>
          <a className="cl-nav-item cl-nav-active">
            <span className="material-icons-outlined">people</span>Clientes
          </a>
        </nav>

        <div className="cl-sidebar-footer">
          <button className="cl-user-btn" onClick={handleLogout}>
            <div className="cl-user-avatar">A</div>
            <div className="cl-user-info">
              <p className="cl-user-name">Admin</p>
              <p className="cl-user-role">Gerente</p>
            </div>
            <span className="material-icons-outlined">settings</span>
          </button>
        </div>
      </aside>

      <main className="cl-main">
        <header className="cl-mobile-header">
          <span className="cl-mobile-script">Sabana</span>
          <button><span className="material-icons-outlined">menu</span></button>
        </header>

        <div className="cl-content">

          <div className="cl-topbar">
            <div>
              <h2 className="cl-page-title">Gestión de Clientes</h2>
              <p className="cl-page-sub">Administra la información y el historial de tus clientes.</p>
            </div>
            <div className="cl-topbar-actions">
              <button className="cl-btn-secondary" onClick={handleExportar}>
                <span className="material-icons-outlined">print</span>Imprimir / PDF
              </button>
              <button className="cl-btn-primary" onClick={() => setModalNuevo(true)}>
                <span className="material-icons-outlined">person_add</span>Nuevo Cliente
              </button>
            </div>
          </div>

          <div className="cl-stats">
            <div className="cl-stat-card">
              <div className="cl-stat-accent cl-accent-blue"></div>
              <div className="cl-stat-top">
                <div>
                  <p className="cl-stat-label">Total Clientes</p>
                  <h3 className="cl-stat-value">{cargando ? '--' : clientes.length}</h3>
                  <p className="cl-stat-trend">
                    <span className="material-icons-outlined">trending_up</span>+5 nuevos esta semana
                  </p>
                </div>
                <div className="cl-stat-icon cl-icon-blue">
                  <span className="material-icons-outlined">group</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cl-toolbar">
            <div className="cl-search-wrapper">
              <span className="material-icons-outlined cl-search-icon">search</span>
              <input
                className="cl-search"
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPaginaActual(1) }}
              />
            </div>
          </div>

          <div className="cl-table-wrapper">
            <div className="cl-table-scroll">
              <table className="cl-table">
                <thead>
                  <tr className="cl-thead-row">
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th className="cl-th-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cargando ? (
                    <tr><td colSpan={3} className="cl-empty">Cargando clientes...</td></tr>
                  ) : clientesPagina.length === 0 ? (
                    <tr><td colSpan={3} className="cl-empty">No se encontraron clientes.</td></tr>
                  ) : (
                    clientesPagina.map(cliente => {
                      const iniciales = getIniciales(cliente.nombre)
                      const color     = getAvatarColor(cliente.nombre)
                      return (
                        <tr key={cliente.id} className="cl-row">
                          <td>
                            <div className="cl-td-nombre">
                              <div className="cl-avatar" style={{ background: color }}>
                                {iniciales}
                              </div>
                              <p className="cl-nombre">{cliente.nombre}</p>
                            </div>
                          </td>
                          <td className="cl-td-tel">
                            {cliente.telefono
                              ? `+57 ${cliente.telefono}`
                              : <span className="cl-empty-text">—</span>
                            }
                          </td>
                          <td className="cl-td-acciones">
                            <button
                              className="cl-btn-accion cl-btn-edit"
                              title="Editar"
                              onClick={() => setClienteEditar(cliente)}
                            >
                              <span className="material-icons-outlined">edit</span>
                            </button>
                            <button
                              className="cl-btn-accion cl-btn-del"
                              title="Eliminar"
                              onClick={() => setClienteEliminar(cliente)}
                            >
                              <span className="material-icons-outlined">delete</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="cl-table-footer">
              <p className="cl-table-info">
                Mostrando{' '}
                {clientesPagina.length === 0
                  ? 0
                  : (paginaSegura - 1) * POR_PAGINA + 1}
                –{(paginaSegura - 1) * POR_PAGINA + clientesPagina.length} de{' '}
                {clientesFiltrados.length} clientes
              </p>
              <div className="cl-pagination">
                <button
                  className="cl-page-btn"
                  disabled={paginaSegura === 1}
                  onClick={() => setPaginaActual(p => p - 1)}
                >
                  <span className="material-icons-outlined">chevron_left</span>
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    className={`cl-page-btn ${paginaSegura === n ? 'cl-page-active' : ''}`}
                    onClick={() => setPaginaActual(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="cl-page-btn"
                  disabled={paginaSegura === totalPaginas}
                  onClick={() => setPaginaActual(p => p + 1)}
                >
                  <span className="material-icons-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="cl-footer-text">
            © 2026 Club de Billar Sabana. Panel de Administración v2.0
          </div>
        </div>
      </main>
    </div>
  )
}

export default Clientes
