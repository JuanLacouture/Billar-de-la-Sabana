import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './ConsumoMesa.css'

function segundosAFormato(seg) {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function calcularSegundos(horaInicio) {
  if (!horaInicio) return 0
  const diff = Math.floor((new Date() - new Date(horaInicio)) / 1000)
  return diff < 0 ? 0 : diff
}

const formatCOP = (val) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

const CATEGORIAS = ['Todo', 'Cervezas', 'Refrescos', 'Comestibles', 'Cafetería', 'Aguardiente', 'Ron & Tequila', 'Whisky', 'Deportivos']
const EMOJIS = {
  'Cervezas':      '🍺',
  'Refrescos':     '🥤',
  'Comestibles':   '🍟',
  'Cafetería':     '☕',
  'Aguardiente':   '🥃',
  'Ron & Tequila': '🍹',
  'Whisky':        '🥃',
  'Deportivos':    '🎱',
}

function ConsumoMesa({ cuenta, onVolver }) {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito]     = useState([])
  const [busqueda, setBusqueda]   = useState('')
  const [categoria, setCategoria] = useState('Todo')
  const [, setTick]               = useState(0)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  // ← Query con join a categorias para obtener el nombre
  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .order('nombre', { ascending: true })
      if (!error && data) setProductos(data)
    }
    cargar()
  }, [])

  const seg          = calcularSegundos(cuenta.hora_apertura)
  const tiempoStr    = segundosAFormato(seg)
  const precioMinuto = cuenta.mesas?.precio_minuto ?? 0
  const subtotalMesa = (seg / 60) * precioMinuto

  // ← Filtro usando categorias.nombre del join
  const productosFiltrados = productos.filter(p => {
    const matchQ   = p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    const matchCat = categoria === 'Todo' || p.categorias?.nombre === categoria
    return matchQ && matchCat
  })

  const agregarProducto = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.id === producto.id)
      if (existe) return prev.map(i =>
        i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
      )
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const quitarProducto = (id) => {
    setCarrito(prev => prev.filter(i => i.producto.id !== id))
  }

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev
        .map(i => i.producto.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter(i => i.cantidad > 0)
    )
  }

  const subtotalProductos = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const subtotalExistente = cuenta.subtotal_productos ?? 0
  const totalProductos    = subtotalExistente + subtotalProductos
  const totalCuenta       = subtotalMesa + totalProductos

  const handleGuardar = async () => {
    if (carrito.length === 0) return
    setGuardando(true)

    const inserts = carrito.map(i => ({
      cuenta_id:   cuenta.id,
      producto_id: i.producto.id,
      cantidad:    i.cantidad,
      precio_unit: i.producto.precio,
      subtotal:    i.producto.precio * i.cantidad,
    }))

    const { error: errInsert } = await supabase
      .from('cuenta_productos')
      .insert(inserts)

    if (!errInsert) {
      const nuevoSubtotal = subtotalExistente + subtotalProductos
      await supabase
        .from('cuentas')
        .update({ subtotal_productos: nuevoSubtotal })
        .eq('id', cuenta.id)
      setCarrito([])
    }

    setGuardando(false)
  }

  const horaInicio = cuenta.hora_apertura
    ? new Date(cuenta.hora_apertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '--'

  // Cantidad en carrito de un producto (para mostrar badge)
  const cantidadEnCarrito = (id) => {
    const item = carrito.find(i => i.producto.id === id)
    return item ? item.cantidad : 0
  }

  return (
    <div className="cm-root">

      <header className="cm-header">
        <div className="cm-header-left">
          <button className="cm-volver-btn" onClick={onVolver}>
            <span className="material-icons-outlined">arrow_back</span>Volver
          </button>
          <div className="cm-divider" />
          <div className="cm-logo">
            <h1 className="cm-logo-title">Club de Billar</h1>
            <span className="cm-logo-sub">De la Sabana</span>
          </div>
        </div>
        <div className="cm-header-right">
          <div className="cm-online-badge">
            <span className="material-icons-outlined cm-online-icon">wifi</span>
            <span>Online</span>
          </div>
        </div>
      </header>

      <main className="cm-main">

        {/* Panel izquierdo */}
        <div className="cm-left">

          {/* Info mesa */}
          <div className="cm-mesa-info">
            <div className="cm-mesa-icon-wrap">
              <span className="material-icons-outlined cm-mesa-icon">sports_bar</span>
            </div>
            <div className="cm-mesa-data">
              <div className="cm-mesa-titulo-row">
                <h2 className="cm-mesa-titulo">
                  Mesa {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}
                </h2>
                <span className="cm-mesa-tipo-badge">{cuenta.mesas?.tipo ?? '--'}</span>
              </div>
              <div className="cm-mesa-badges">
                <span className="cm-badge cm-badge-blue">
                  <span className="material-icons-outlined">schedule</span>
                  Inicio: <strong>{horaInicio}</strong>
                </span>
                <span className="cm-badge cm-badge-yellow">
                  <span className="material-icons-outlined">timer</span>
                  Tiempo: <strong className="cm-mono">{tiempoStr}</strong>
                </span>
                <span className="cm-badge cm-badge-gray">
                  <span className="material-icons-outlined">attach_money</span>
                  Tarifa: <strong>{formatCOP(precioMinuto * 60)}/h</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Catálogo */}
          <div className="cm-catalogo">
            <div className="cm-catalogo-header">
              <div className="cm-search-row">
                <div className="cm-search-wrap">
                  <span className="material-icons-outlined cm-search-icon">search</span>
                  <input
                    className="cm-search"
                    type="text"
                    placeholder="Buscar productos..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                  />
                </div>
              </div>
              <div className="cm-cats">
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat}
                    className={`cm-cat-btn ${categoria === cat ? 'cm-cat-active' : ''}`}
                    onClick={() => setCategoria(cat)}
                  >
                    {cat !== 'Todo' ? EMOJIS[cat] + ' ' : ''}{cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid productos */}
            <div className="cm-grid-wrap">
              <div className="cm-grid">
                {productosFiltrados.length === 0 ? (
                  <p className="cm-empty">No hay productos disponibles.</p>
                ) : (
                  productosFiltrados.map(producto => {
                    const cant = cantidadEnCarrito(producto.id)
                    return (
                      <div key={producto.id} className="cm-producto-card">
                        <div className="cm-producto-img-wrap">
                          {producto.imagen_url ? (
                            <img src={producto.imagen_url} alt={producto.nombre} className="cm-producto-img" />
                          ) : (
                            <div className="cm-producto-img-placeholder">
                              <span className="material-icons-outlined">inventory_2</span>
                            </div>
                          )}
                          <div className="cm-producto-overlay" />
                          <span className="cm-producto-precio">{formatCOP(producto.precio)}</span>

                          {/* Badge cantidad si ya está en carrito */}
                          {cant > 0 && (
                            <span className="cm-producto-badge">{cant}</span>
                          )}

                          {/* ← Hover overlay con controles */}
                          <div className="cm-producto-hover">
                            {cant === 0 ? (
                              <button
                                className="cm-hover-agregar"
                                onClick={() => agregarProducto(producto)}
                              >
                                <span className="material-icons-outlined">add_shopping_cart</span>
                                Agregar
                              </button>
                            ) : (
                              <div className="cm-hover-controls">
                                <button onClick={() => cambiarCantidad(producto.id, -1)}>
                                  <span className="material-icons-outlined">remove</span>
                                </button>
                                <span>{cant}</span>
                                <button onClick={() => agregarProducto(producto)}>
                                  <span className="material-icons-outlined">add</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="cm-producto-info">
                          <h3 className="cm-producto-nombre">{producto.nombre}</h3>
                          <p className="cm-producto-desc">{producto.categorias?.nombre ?? '--'}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel derecho — Cuenta */}
        <aside className="cm-aside">

          <div className="cm-aside-header">
            <div className="cm-aside-title-row">
              <h3 className="cm-aside-title">
                <span className="material-icons-outlined">receipt_long</span>
                Cuenta Actual
              </h3>
              <span className="cm-orden-badge">Mesa #{cuenta.mesas?.numero ?? '--'}</span>
            </div>
            {cuenta.clientes?.nombre && (
              <div className="cm-cliente-box">
                <span className="cm-cliente-label">Cuenta a nombre de:</span>
                <span className="cm-cliente-nombre">{cuenta.clientes.nombre}</span>
              </div>
            )}
          </div>

          <div className="cm-aside-items">

            {/* Tiempo de mesa */}
            <div className="cm-item-mesa">
              <div className="cm-item-mesa-left">
                <div className="cm-item-mesa-icon">
                  <span className="material-icons-outlined">timelapse</span>
                </div>
                <div>
                  <p className="cm-item-mesa-nombre">
                    Tiempo de Mesa ({String(cuenta.mesas?.numero ?? '--').padStart(2, '0')})
                  </p>
                  <p className="cm-item-mesa-desc">
                    {Math.floor(seg / 3600)}h {Math.floor((seg % 3600) / 60)}m @ {formatCOP(precioMinuto * 60)}/h
                  </p>
                </div>
              </div>
              <span className="cm-item-mesa-total">{formatCOP(subtotalMesa)}</span>
            </div>

            {subtotalExistente > 0 && (
              <div className="cm-item-guardado">
                <span className="material-icons-outlined">check_circle</span>
                <span>Consumos anteriores: {formatCOP(subtotalExistente)}</span>
              </div>
            )}

            {/* ← Carrito con hover para sumar/restar */}
            {carrito.map(item => (
              <div key={item.producto.id} className="cm-carrito-item">
                <div className="cm-carrito-item-left">
                  <div className="cm-carrito-cant-wrap">
                    {/* Controles visibles en hover */}
                    <button
                      className="cm-carrito-ctrl cm-carrito-ctrl-minus"
                      onClick={() => cambiarCantidad(item.producto.id, -1)}
                    >−</button>
                    <span className="cm-carrito-cant">{item.cantidad}</span>
                    <button
                      className="cm-carrito-ctrl cm-carrito-ctrl-plus"
                      onClick={() => cambiarCantidad(item.producto.id, +1)}
                    >+</button>
                  </div>
                  <div>
                    <p className="cm-carrito-nombre">{item.producto.nombre}</p>
                    <p className="cm-carrito-precio">{formatCOP(item.producto.precio)} c/u</p>
                  </div>
                </div>
                <div className="cm-carrito-right">
                  <p className="cm-carrito-subtotal">
                    {formatCOP(item.producto.precio * item.cantidad)}
                  </p>
                  <button
                    className="cm-carrito-del"
                    onClick={() => quitarProducto(item.producto.id)}
                  >
                    <span className="material-icons-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {carrito.length === 0 && subtotalExistente === 0 && (
              <p className="cm-carrito-vacio">
                <span className="material-icons-outlined">shopping_cart</span>
                Sin productos aún
              </p>
            )}
          </div>

          <div className="cm-aside-footer">
            <div className="cm-totales">
              <div className="cm-total-row">
                <span>Mesa</span>
                <span>{formatCOP(subtotalMesa)}</span>
              </div>
              <div className="cm-total-row">
                <span>Productos</span>
                <span>{formatCOP(totalProductos)}</span>
              </div>
              <div className="cm-total-final">
                <span>Total Actual</span>
                <span>{formatCOP(totalCuenta)}</span>
              </div>
            </div>

            <button
              className="cm-btn-guardar"
              onClick={handleGuardar}
              disabled={guardando || carrito.length === 0}
            >
              <span className="material-icons-outlined">save</span>
              {guardando ? 'Guardando...' : 'Guardar Consumo'}
            </button>

            <button className="cm-btn-liquidar" onClick={onVolver}>
              <span className="material-icons-outlined">payments</span>
              Liquidar Cuenta
            </button>
          </div>

        </aside>
      </main>
    </div>
  )
}

export default ConsumoMesa
