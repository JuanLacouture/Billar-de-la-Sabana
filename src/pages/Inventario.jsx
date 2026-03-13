import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './Inventario.css'

// ── Paleta por categoría ──
const CAT_STYLE = {
  'Cervezas':    'cat-amber',
  'Refrescos':   'cat-blue',
  'Comestibles': 'cat-green',
  'Cafeteria':   'cat-brown',
  'Licores':     'cat-purple',
  'Deportivos':  'cat-cyan',
}

const formatCOP = (val) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(val ?? 0)

// ══════════════════════════════════════════════════════
//  MODAL — CREAR / EDITAR PRODUCTO
// ══════════════════════════════════════════════════════
function ModalProducto({ producto, categorias, onGuardar, onCerrar }) {
  const esNuevo = !producto
  const [form, setForm] = useState({
    nombre:       producto?.nombre       ?? '',
    categoria_id: producto?.categoria_id ?? '',
    precio:       producto?.precio       ?? '',
    stock_actual: producto?.stock_actual ?? '',
    stock_minimo: producto?.stock_minimo ?? '',
    imagen_url:   producto?.imagen_url   ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (esNuevo && (!form.nombre.trim() || !form.precio || !form.categoria_id)) {
      setError('Nombre, categoría y precio son obligatorios.')
      return
    }
    setGuardando(true)
    setError(null)
    // Al editar: solo stock_actual y stock_minimo son modificables
    const payload = esNuevo
      ? {
          nombre:       form.nombre.trim(),
          categoria_id: parseInt(form.categoria_id),
          precio:       parseFloat(form.precio),
          stock_actual: parseInt(form.stock_actual) || 0,
          stock_minimo: parseInt(form.stock_minimo) || 0,
          imagen_url:   form.imagen_url.trim() || null,
        }
      : {
          stock_actual: parseInt(form.stock_actual) || 0,
          stock_minimo: parseInt(form.stock_minimo) || 0,
        }
    const { error: err } = esNuevo
      ? await supabase.from('productos').insert(payload)
      : await supabase.from('productos').update(payload).eq('id', producto.id)
    setGuardando(false)
    if (err) { setError(err.message); return }
    onGuardar()
  }

  return (
    <div className="inv-overlay">
      <div className="inv-modal">

        <div className="inv-mh">
          <div className="inv-mh-left">
            <div className="inv-mh-icon">
              <span className="material-icons-outlined">{esNuevo ? 'add_box' : 'edit'}</span>
            </div>
            <div>
              <h3 className="inv-mh-title">{esNuevo ? 'Nuevo Producto' : 'Editar Producto'}</h3>
              <p className="inv-mh-sub">Inventario · Sabana Billar</p>
            </div>
          </div>
          <button className="inv-mh-close" onClick={onCerrar}>
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="inv-mb">
          {error && (
            <div className="inv-error">
              <span className="material-icons-outlined">error_outline</span>{error}
            </div>
          )}
          <div className="inv-form-grid">
            <div className="inv-field inv-field-full">
              <label className="inv-lbl">
                Nombre del producto
                {!esNuevo && <span className="inv-lbl-lock"><span className="material-icons-outlined">lock</span></span>}
              </label>
              <input
                className={`inv-inp ${!esNuevo ? 'inv-inp-locked' : ''}`}
                type="text" placeholder="Ej: Club Colombia Dorada"
                value={form.nombre}
                onChange={e => esNuevo && set('nombre', e.target.value)}
                readOnly={!esNuevo}
              />
            </div>
            <div className="inv-field">
              <label className="inv-lbl">
                Categoría
                {!esNuevo && <span className="inv-lbl-lock"><span className="material-icons-outlined">lock</span></span>}
              </label>
              <select
                className={`inv-inp ${!esNuevo ? 'inv-inp-locked' : ''}`}
                value={form.categoria_id}
                onChange={e => esNuevo && set('categoria_id', e.target.value)}
                disabled={!esNuevo}
              >
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="inv-field">
              <label className="inv-lbl">
                Precio de venta
                {!esNuevo && <span className="inv-lbl-lock"><span className="material-icons-outlined">lock</span></span>}
              </label>
              <div className="inv-prefix-wrap">
                <span className="inv-prefix">$</span>
                <input
                  className={`inv-inp inv-inp-px ${!esNuevo ? 'inv-inp-locked' : ''}`}
                  type="number" placeholder="0"
                  value={form.precio}
                  onChange={e => esNuevo && set('precio', e.target.value)}
                  readOnly={!esNuevo}
                />
              </div>
            </div>
            <div className="inv-field">
              <label className="inv-lbl">Stock actual</label>
              <input className="inv-inp" type="number" placeholder="0"
                value={form.stock_actual} onChange={e => set('stock_actual', e.target.value)} />
            </div>
            <div className="inv-field">
              <label className="inv-lbl">Stock mínimo <span className="inv-hint-lbl">(alerta)</span></label>
              <input className="inv-inp" type="number" placeholder="0"
                value={form.stock_minimo} onChange={e => set('stock_minimo', e.target.value)} />
            </div>
            <div className="inv-field inv-field-full">
              <label className="inv-lbl">
                URL imagen
                {!esNuevo && <span className="inv-lbl-lock"><span className="material-icons-outlined">lock</span></span>}
              </label>
              {!esNuevo && form.imagen_url ? (
                <div className="inv-img-preview-wrap">
                  <img src={form.imagen_url} alt="preview" className="inv-img-preview" />
                  <span className="inv-img-preview-locked">Solo lectura</span>
                </div>
              ) : (
                <input
                  className={`inv-inp ${!esNuevo ? 'inv-inp-locked' : ''}`}
                  type="url" placeholder="https://..."
                  value={form.imagen_url}
                  onChange={e => esNuevo && set('imagen_url', e.target.value)}
                  readOnly={!esNuevo}
                />
              )}
            </div>
          </div>
        </div>

        <div className="inv-mf">
          <button className="inv-btn-cancel" onClick={onCerrar}>Cancelar</button>
          <button className="inv-btn-save" onClick={guardar} disabled={guardando}>
            <span className="material-icons-outlined">{guardando ? 'hourglass_top' : 'save'}</span>
            {guardando ? 'Guardando...' : (esNuevo ? 'Crear Producto' : 'Guardar Cambios')}
          </button>
        </div>

      </div>
    </div>
  )
}



// ══════════════════════════════════════════════════════
//  INVENTARIO PRINCIPAL
// ══════════════════════════════════════════════════════
function Inventario({ onNavegar }) {
  const [productos, setProductos]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando]     = useState(true)
  const [busqueda, setBusqueda]     = useState('')
  const [filtrocat, setFiltrocat]   = useState('todos')

  const [modalNuevo, setModalNuevo]       = useState(false)
  const [modalEditar, setModalEditar]     = useState(null)

  const cargar = async () => {
    setCargando(true)
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from('productos').select('*, categorias(nombre)').order('nombre'),
      supabase.from('categorias').select('*').order('nombre'),
    ])
    if (prods) setProductos(prods)
    if (cats)  setCategorias(cats)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  const onGuardar = () => { setModalNuevo(false); setModalEditar(null); cargar() }

  // ── Clasificación de estado ──
  const estado = (p) => {
    if (p.stock_actual === 0) return 'agotado'
    if (p.stock_minimo > 0 && p.stock_actual < p.stock_minimo / 2) return 'critico'
    if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo)    return 'bajo'
    return 'ok'
  }

  // Barra de progreso: referencia = stock_minimo * 5
  const barPct = (p) => {
    if (!p.stock_minimo || p.stock_minimo === 0) return 80
    return Math.min(100, Math.round((p.stock_actual / (p.stock_minimo * 5)) * 100))
  }

  // Alertas
  const alertas = productos.filter(p => estado(p) !== 'ok')
  const nCriticos = alertas.filter(p => estado(p) === 'agotado' || estado(p) === 'critico').length

  // Stats
  const valorInv  = productos.reduce((s, p) => s + (p.stock_actual ?? 0) * (p.precio ?? 0), 0)
  const totalStock = productos.reduce((s, p) => s + (p.stock_actual ?? 0), 0)

  // Catálogos filtrados
  const catUnicas = [...new Set(productos.map(p => p.categorias?.nombre).filter(Boolean))]
  const filtrados = productos.filter(p => {
    const q   = busqueda.toLowerCase()
    const cat = p.categorias?.nombre ?? ''
    const mq  = p.nombre.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
    const mc  = filtrocat === 'todos' || cat === filtrocat
    return mq && mc
  })

  const ESTADO_LABEL = { agotado: 'Agotado', critico: 'Crítico', bajo: 'Stock bajo', ok: 'Normal' }
  const ESTADO_CLASS = { agotado: 'tag-agotado', critico: 'tag-critico', bajo: 'tag-bajo', ok: 'tag-ok' }

  return (
    <div className="inv-root">

      {/* ── MODALES ── */}
      {modalEditar   && <ModalProducto producto={modalEditar} categorias={categorias} onGuardar={onGuardar} onCerrar={() => setModalEditar(null)} />}


      {/* ════════════════ SIDEBAR ════════════════ */}
      <aside className="inv-sidebar">
        <div className="inv-sidebar-logo">
          <span className="material-icons-outlined inv-sidebar-icon">sports_esports</span>
          <div>
            <h1 className="inv-sidebar-title">Club de Billar</h1>
            <span className="inv-sidebar-script">Sabana</span>
          </div>
        </div>

        <nav className="inv-nav">
          <a className="inv-nav-item" onClick={() => onNavegar?.('dashboard')}>
            <span className="material-icons-outlined">dashboard</span>Dashboard
          </a>
          <a className="inv-nav-item inv-nav-active">
            <span className="material-icons-outlined">inventory_2</span>Inventario
          </a>
          <a className="inv-nav-item" onClick={() => onNavegar?.('cuentas')}>
            <span className="material-icons-outlined">receipt_long</span>Cuentas
          </a>
          <a className="inv-nav-item">
            <span className="material-icons-outlined">bar_chart</span>Reportes
          </a>
          <a className="inv-nav-item" onClick={() => onNavegar?.('clientes')}>
            <span className="material-icons-outlined">people</span>Clientes
          </a>
        </nav>

        <div className="inv-sidebar-footer">
          <button className="inv-user-btn" onClick={() => supabase.auth.signOut()}>
            <div className="inv-user-avatar">A</div>
            <div className="inv-user-info">
              <p className="inv-user-name">Admin</p>
              <p className="inv-user-role">Gerente</p>
            </div>
            <span className="material-icons-outlined">settings</span>
          </button>
        </div>
      </aside>

      {/* ════════════════ MAIN ════════════════ */}
      <main className="inv-main">

        {/* ── TOP HEADER (como en el HTML ref.) ── */}
        <header className="inv-header">
          <div>
            <h2 className="inv-header-title">Gestión de Inventario</h2>
            <p className="inv-header-sub">
              <span className="inv-hl">{productos.length} productos</span> ·{' '}
              <span className="inv-hl">{totalStock}</span> unidades en stock
            </p>
          </div>
          <div className="inv-header-actions">
            {/* Búsqueda en header, igual al HTML de referencia */}
            <div className="inv-header-search-wrap">
              <span className="material-icons-outlined inv-header-search-icon">search</span>
              <input
                className="inv-header-search"
                type="text"
                placeholder="Buscar productos..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className="inv-header-search-clear" onClick={() => setBusqueda('')}>
                  <span className="material-icons-outlined">close</span>
                </button>
              )}
            </div>
            {/* Botón Registrar Gasto — lógica pendiente */}
            <button className="inv-btn-gasto" onClick={() => {}}>
              <span className="material-icons-outlined">receipt</span>
              Registrar Gasto
            </button>

          </div>
        </header>

        {/* ── CONTENIDO SCROLLEABLE ── */}
        <div className="inv-content">

          {/* ── ALERTAS ── */}
          {!cargando && alertas.length === 0 && (
            <div className="inv-all-ok">
              <div className="inv-all-ok-icon">
                <span className="material-icons-outlined">verified</span>
              </div>
              <div className="inv-all-ok-text">
                <p className="inv-all-ok-title">¡Todo el inventario está en orden!</p>
                <p className="inv-all-ok-sub">Todos los productos tienen stock suficiente. No hay alertas activas.</p>
              </div>
            </div>
          )}

          {alertas.length > 0 && (
            <section className="inv-section">
              <div className="inv-section-hd">
                <h3 className="inv-section-title">Alertas de Stock Bajo</h3>
                <span className={`inv-badge ${nCriticos > 0 ? 'inv-badge-red' : 'inv-badge-orange'}`}>
                  {nCriticos > 0 ? `${nCriticos} Crítico${nCriticos > 1 ? 's' : ''}` : `${alertas.length} Bajo${alertas.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Scroll horizontal de tarjetas */}
              <div className="inv-alert-scroll">
                {alertas.map(p => {
                  const est  = estado(p)
                  const pct  = barPct(p)
                  const isCrit = est === 'agotado' || est === 'critico'
                  return (
                    <div key={p.id} className={`inv-alert-card ${isCrit ? 'inv-alert-red' : 'inv-alert-orange'}`}>
                      <div className="inv-alert-img-wrap">
                        {p.imagen_url
                          ? <img src={p.imagen_url} alt={p.nombre} className="inv-alert-img" />
                          : (
                            <div className="inv-alert-img-ph">
                              <span className="material-icons-outlined">inventory_2</span>
                            </div>
                          )
                        }
                      </div>
                      <div className="inv-alert-info">
                        <p className="inv-alert-nombre">{p.nombre}</p>
                        <p className={`inv-alert-stock ${isCrit ? 'inv-text-red' : 'inv-text-orange'}`}>
                          {p.stock_actual === 0 ? '¡Sin stock!' : `Solo ${p.stock_actual} unidades`}
                        </p>
                        <div className="inv-bar-bg">
                          <div
                            className={`inv-bar-fill ${isCrit ? 'inv-bar-red' : 'inv-bar-orange'}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <p className="inv-alert-min">Mínimo: {p.stock_minimo} u.</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── TABLA CATÁLOGO ── */}
          <section className="inv-section">
            <div className="inv-section-hd inv-section-hd-flex">
              <h3 className="inv-section-title">Catálogo de Productos</h3>
              {/* Tabs de categoría */}
              <div className="inv-cat-tabs">
                <button
                  className={`inv-ctab ${filtrocat === 'todos' ? 'inv-ctab-active' : ''}`}
                  onClick={() => setFiltrocat('todos')}
                >Todos</button>
                {catUnicas.map(cat => (
                  <button
                    key={cat}
                    className={`inv-ctab ${filtrocat === cat ? 'inv-ctab-active' : ''}`}
                    onClick={() => setFiltrocat(cat)}
                  >{cat}</button>
                ))}
              </div>
            </div>

            <div className="inv-table-wrap">
              <div className="inv-table-scroll">
                <table className="inv-table">
                  <thead>
                    <tr className="inv-thead">
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Mín.</th>
                      <th>Estado</th>
                      <th>Precio</th>
                      <th className="inv-th-r">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargando ? (
                      <tr><td colSpan={7} className="inv-empty">
                        <span className="material-icons-outlined inv-spin">autorenew</span>
                        Cargando inventario...
                      </td></tr>
                    ) : filtrados.length === 0 ? (
                      <tr><td colSpan={7} className="inv-empty">
                        <span className="material-icons-outlined">inventory_2</span>
                        No hay productos con esos filtros.
                      </td></tr>
                    ) : filtrados.map(p => {
                      const est    = estado(p)
                      const catNom = p.categorias?.nombre ?? '—'
                      const catCls = CAT_STYLE[catNom] ?? 'cat-slate'
                      return (
                        <tr key={p.id} className="inv-row">
                          <td>
                            <div className="inv-td-prod">
                              {p.imagen_url
                                ? <img src={p.imagen_url} alt={p.nombre} className="inv-prod-img" />
                                : <div className="inv-prod-ph"><span className="material-icons-outlined">inventory_2</span></div>
                              }
                              <div>
                                <p className="inv-prod-nombre">{p.nombre}</p>
                                <p className="inv-prod-id">ID: {p.id}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`inv-cat-tag ${catCls}`}>{catNom}</span>
                          </td>
                          <td>
                            <span className={`inv-stock-num ${est === 'agotado' || est === 'critico' ? 'inv-text-red' : est === 'bajo' ? 'inv-text-orange' : ''}`}>
                              {p.stock_actual}
                            </span>
                            <span className="inv-stock-u"> u.</span>
                          </td>
                          <td className="inv-td-min">{p.stock_minimo ?? 0} u.</td>
                          <td>
                            <span className={`inv-status ${ESTADO_CLASS[est]}`}>
                              {ESTADO_LABEL[est]}
                            </span>
                          </td>
                          <td className="inv-td-precio">{formatCOP(p.precio)}</td>
                          <td className="inv-td-actions">
                            <button className="inv-icon-btn inv-icon-edit" onClick={() => setModalEditar(p)}
                              title="Editar">
                              <span className="material-icons-outlined">edit</span>
                            </button>

                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="inv-table-footer">
                <p className="inv-table-info">
                  Mostrando {filtrados.length} de {productos.length} productos
                </p>
                <div className="inv-pagination">
                  <button className="inv-page-btn">
                    <span className="material-icons-outlined">chevron_left</span>
                  </button>
                  <button className="inv-page-btn inv-page-active">1</button>
                  <button className="inv-page-btn">
                    <span className="material-icons-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <p className="inv-footer-text">© 2026 Club de Billar Sabana. Sistema de Gestión Premium</p>
        </div>
      </main>
    </div>
  )
}

export default Inventario