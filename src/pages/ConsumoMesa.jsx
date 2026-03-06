import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './ConsumoMesa.css'
import LiquidarCuenta from './LiquidarCuenta'

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

function ConsumoMesa({ cuenta: cuentaInicial, onVolver, irALiquidar = false }) {
  const [cuenta, setCuenta] = useState(cuentaInicial)
  const [productos, setProductos]           = useState([])
  const [carrito, setCarrito]               = useState([])
  const [itemsGuardados, setItemsGuardados] = useState([])
  const [busqueda, setBusqueda]             = useState('')
  const [categoria, setCategoria]           = useState('Todo')
  const [, setTick]                         = useState(0)
  const [guardando, setGuardando]           = useState(false)
  const [guardadoOk, setGuardadoOk]         = useState(false)
  const [errorMsg, setErrorMsg]             = useState(null)
  const [subtotalGuardado, setSubtotalGuardado] = useState(cuentaInicial.subtotal_productos ?? 0)
  const [confirmModal, setConfirmModal]     = useState(null)
  const [mostrarLiquidar, setMostrarLiquidar] = useState(irALiquidar)
  const [segCongelado, setSegCongelado]     = useState(irALiquidar ? calcularSegundos(cuentaInicial.hora_apertura) : null)

  // ── Recargar cuenta completa con mesa_id ──
  useEffect(() => {
    const cargarCuenta = async () => {
      const { data, error } = await supabase
        .from('cuentas')
        .select('*, mesas(*), clientes(*)')
        .eq('id', cuentaInicial.id)
        .single()
      if (!error && data) {
        setCuenta(data)
        // Sincronizar subtotalGuardado si la BD tiene un valor más actualizado
        setSubtotalGuardado(data.subtotal_productos ?? 0)
      }
    }
    cargarCuenta()
  }, [cuentaInicial.id])

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

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

  useEffect(() => {
    recargarItems()
  }, [cuentaInicial.id])

  const seg          = calcularSegundos(cuenta.hora_apertura)
  const tiempoStr    = segundosAFormato(seg)
  const precioMinuto = cuenta.mesas?.precio_minuto ?? 0
  const subtotalMesa = (seg / 60) * precioMinuto

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

  const subtotalCarrito = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0)
  const totalProductos  = subtotalGuardado + subtotalCarrito
  const totalCuenta     = subtotalMesa + totalProductos

  const recargarItems = async () => {
    const { data } = await supabase
      .from('items_cuenta')
      .select('*, productos(nombre, precio)')
      .eq('cuenta_id', cuentaInicial.id)
      .order('id', { ascending: true })
    if (data) setItemsGuardados(data)
  }

  const itemsAgrupados = Object.values(
    itemsGuardados.reduce((acc, item) => {
      const pid = item.producto_id
      if (acc[pid]) {
        acc[pid].cantidad += item.cantidad
        acc[pid].ids.push(item.id)
      } else {
        acc[pid] = { ...item, ids: [item.id] }
      }
      return acc
    }, {})
  )

  const handleGuardar = async () => {
    if (carrito.length === 0) return
    setGuardando(true)
    setErrorMsg(null)

    const inserts = carrito.map(i => ({
      cuenta_id:       cuenta.id,
      producto_id:     i.producto.id,
      cantidad:        i.cantidad,
      precio_unitario: i.producto.precio,
    }))

    const { error: errItems } = await supabase
      .from('items_cuenta')
      .insert(inserts)

    if (errItems) {
      setErrorMsg('Error al guardar los productos. Intenta de nuevo.')
      setGuardando(false)
      return
    }

    for (const item of carrito) {
      try {
        await supabase.rpc('decrementar_stock', {
          p_producto_id: item.producto.id,
          p_cantidad:    item.cantidad,
        })
      } catch (_) {}
    }

    const movimientos = carrito.map(i => ({
      producto_id:     i.producto.id,
      cuenta_id:       cuenta.id,
      tipo_movimiento: 'salida',
      cantidad:        i.cantidad,
    }))
    await supabase.from('movimientos_inventario').insert(movimientos)

    const nuevoSubtotal = subtotalGuardado + subtotalCarrito
    const { error: errCuenta } = await supabase
      .from('cuentas')
      .update({ subtotal_productos: nuevoSubtotal })
      .eq('id', cuenta.id)

    if (errCuenta) {
      setErrorMsg('Productos guardados pero error al actualizar total.')
      setGuardando(false)
      return
    }

    // ── FIX: sincronizar cuenta.subtotal_productos en el estado local ──
    setSubtotalGuardado(nuevoSubtotal)
    setCuenta(prev => ({ ...prev, subtotal_productos: nuevoSubtotal }))

    setCarrito([])
    await recargarItems()
    setGuardadoOk(true)
    setTimeout(() => setGuardadoOk(false), 2500)
    setGuardando(false)
  }

  const confirmarEliminar = (ids, subtotalItem, nombre, cantidadTotal) => {
    setConfirmModal({ ids, subtotalItem, nombre, cantidadTotal, cantidadEliminar: cantidadTotal })
  }

  const handleEliminarConfirmado = async () => {
    const { ids, cantidadTotal, cantidadEliminar, subtotalItem } = confirmModal
    const precioUnit = subtotalItem / cantidadTotal
    setConfirmModal(null)

    if (cantidadEliminar === cantidadTotal) {
      const { error } = await supabase
        .from('items_cuenta')
        .delete()
        .in('id', ids)
      if (error) { setErrorMsg('No se pudo eliminar.'); return }
    } else {
      const { data: filas } = await supabase
        .from('items_cuenta')
        .select('id, cantidad')
        .in('id', ids)
        .order('id', { ascending: true })

      let restante = cantidadEliminar
      for (const fila of filas) {
        if (restante <= 0) break
        if (fila.cantidad <= restante) {
          await supabase.from('items_cuenta').delete().eq('id', fila.id)
          restante -= fila.cantidad
        } else {
          await supabase
            .from('items_cuenta')
            .update({ cantidad: fila.cantidad - restante })
            .eq('id', fila.id)
          restante = 0
        }
      }
    }

    const subtotalARestar = precioUnit * cantidadEliminar
    const nuevoSubtotal   = Math.max(0, subtotalGuardado - subtotalARestar)

    await supabase
      .from('cuentas')
      .update({ subtotal_productos: nuevoSubtotal })
      .eq('id', cuenta.id)

    // ── FIX: sincronizar también al eliminar ──
    setSubtotalGuardado(nuevoSubtotal)
    setCuenta(prev => ({ ...prev, subtotal_productos: nuevoSubtotal }))

    await recargarItems()
  }

  const horaInicio = cuenta.hora_apertura
    ? new Date(cuenta.hora_apertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '--'

  const cantidadEnCarrito = (id) => {
    const item = carrito.find(i => i.producto.id === id)
    return item ? item.cantidad : 0
  }

  // ── FIX: congelar seg Y sincronizar subtotal_productos en cuenta ──
  const handleAbrirLiquidar = () => {
    const segActual = calcularSegundos(cuenta.hora_apertura)
    setSegCongelado(segActual)
    setCuenta(prev => ({ ...prev, subtotal_productos: subtotalGuardado }))
    setMostrarLiquidar(true)
  }

  if (mostrarLiquidar) {
    return (
      <LiquidarCuenta
        cuenta={cuenta}
        itemsAgrupados={itemsAgrupados}
        segTranscurridos={segCongelado}
        onVolver={() => setMostrarLiquidar(false)}
        onLiquidado={onVolver}
      />
    )
  }

  return (
    <div className="cm-root">

      {confirmModal && (
        <div className="cm-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-icon">
              <span className="material-icons-outlined">delete_forever</span>
            </div>
            <h3 className="cm-modal-title">¿Eliminar producto?</h3>
            <p className="cm-modal-desc">
              <strong>{confirmModal.nombre}</strong>
            </p>

            {confirmModal.cantidadTotal > 1 ? (
              <div className="cm-modal-cantidad">
                <p className="cm-modal-cant-label">¿Cuántas unidades eliminar?</p>
                <div className="cm-modal-cant-controls">
                  <button onClick={() => setConfirmModal(prev => ({
                    ...prev, cantidadEliminar: Math.max(1, prev.cantidadEliminar - 1)
                  }))}>−</button>
                  <span>{confirmModal.cantidadEliminar}</span>
                  <button onClick={() => setConfirmModal(prev => ({
                    ...prev, cantidadEliminar: Math.min(prev.cantidadTotal, prev.cantidadEliminar + 1)
                  }))}>+</button>
                </div>
                <p className="cm-modal-cant-hint">
                  {confirmModal.cantidadEliminar === confirmModal.cantidadTotal
                    ? 'Se eliminará el producto completo'
                    : `Quedarán ${confirmModal.cantidadTotal - confirmModal.cantidadEliminar} unidad(es)`
                  }
                </p>
              </div>
            ) : (
              <p className="cm-modal-desc">Esta acción no se puede deshacer.</p>
            )}

            <div className="cm-modal-actions">
              <button className="cm-modal-cancel" onClick={() => setConfirmModal(null)}>
                Cancelar
              </button>
              <button className="cm-modal-confirm" onClick={handleEliminarConfirmado}>
                <span className="material-icons-outlined">delete</span>
                Eliminar {confirmModal.cantidadEliminar > 1 ? `(${confirmModal.cantidadEliminar})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="cm-left">
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
                          {cant > 0 && <span className="cm-producto-badge">{cant}</span>}
                          <div className="cm-producto-hover">
                            {cant === 0 ? (
                              <button className="cm-hover-agregar" onClick={() => agregarProducto(producto)}>
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

            {itemsAgrupados.map(item => (
              <div key={item.producto_id} className="cm-carrito-item cm-item-guardado-row">
                <div className="cm-carrito-item-left">
                  <div className="cm-carrito-cant">{item.cantidad}</div>
                  <div>
                    <p className="cm-carrito-nombre">{item.productos?.nombre}</p>
                    <p className="cm-carrito-precio">{formatCOP(item.productos?.precio)} c/u</p>
                  </div>
                </div>
                <div className="cm-carrito-right">
                  <p className="cm-carrito-subtotal">
                    {formatCOP(item.cantidad * item.productos?.precio)}
                  </p>
                  <button
                    className="cm-carrito-del"
                    onClick={() => confirmarEliminar(
                      item.ids,
                      item.cantidad * item.productos?.precio,
                      item.productos?.nombre,
                      item.cantidad
                    )}
                  >
                    <span className="material-icons-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {itemsAgrupados.length > 0 && carrito.length > 0 && (
              <div className="cm-separador-carrito"><span>Nuevos</span></div>
            )}

            {carrito.map(item => (
              <div key={item.producto.id} className="cm-carrito-item">
                <div className="cm-carrito-item-left">
                  <div className="cm-carrito-cant-wrap">
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
                  <button className="cm-carrito-del" onClick={() => quitarProducto(item.producto.id)}>
                    <span className="material-icons-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}

            {itemsAgrupados.length === 0 && carrito.length === 0 && (
              <p className="cm-carrito-vacio">
                <span className="material-icons-outlined">shopping_cart</span>
                Sin productos aún
              </p>
            )}
          </div>

          <div className="cm-aside-footer">
            {guardadoOk && (
              <div className="cm-feedback-ok">
                <span className="material-icons-outlined">check_circle</span>
                Consumo guardado correctamente
              </div>
            )}
            {errorMsg && (
              <div className="cm-feedback-error">
                <span className="material-icons-outlined">error</span>
                {errorMsg}
              </div>
            )}

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
              <span className="material-icons-outlined">
                {guardando ? 'hourglass_top' : 'save'}
              </span>
              {guardando ? 'Guardando...' : `Guardar Consumo (${carrito.length})`}
            </button>

            <button className="cm-btn-liquidar" onClick={handleAbrirLiquidar}>
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