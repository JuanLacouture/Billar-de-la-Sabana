import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './DetalleCuenta.css'

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
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(val)

function DetalleCuenta({ cuenta, onVolver, onLiquidar, onAgregarProductos }) {
  const [items, setItems]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [, setTick]             = useState(0)

  // Recarga items
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from('items_cuenta')
        .select('*, productos(nombre, precio)')
        .eq('cuenta_id', cuenta.id)
        .order('id', { ascending: true })
      if (data) setItems(data)
      setCargando(false)
    }
    cargar()
  }, [cuenta.id])

  // Ticker para tiempo en vivo
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const seg          = calcularSegundos(cuenta.hora_apertura)
  const precioMinuto = cuenta.mesas?.precio_minuto ?? 0
  const subtotalMesa = (seg / 60) * precioMinuto
  const subtotalProd = cuenta.subtotal_productos ?? 0
  const totalExacto  = subtotalMesa + subtotalProd
  // Redondear a 50 igual que LiquidarCuenta
  const totalRedon   = Math.round(totalExacto / 50) * 50

  const horas = Math.floor(seg / 3600)
  const mins  = Math.floor((seg % 3600) / 60)

  const tieneMesa    = !!cuenta.mesa_id
  const tieneCliente = !!cuenta.clientes?.nombre

  // Agrupar items
  const itemsAgrupados = Object.values(
    items.reduce((acc, item) => {
      const pid = item.producto_id
      if (acc[pid]) {
        acc[pid].cantidad += item.cantidad
      } else {
        acc[pid] = { ...item }
      }
      return acc
    }, {})
  )

  const totalItems = itemsAgrupados.reduce((s, i) => s + i.cantidad, 0) + (tieneMesa ? 1 : 0)

  const horaApertura = cuenta.hora_apertura
    ? new Date(cuenta.hora_apertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : '--'

  return (
    <div className="dc-root">

      {/* ── HEADER ── */}
      <header className="dc-header">
        <div className="dc-header-inner">
          <div className="dc-header-left">
            <div className="dc-header-brand">
              <span className="material-icons-outlined dc-brand-icon">payments</span>
              <h2 className="dc-header-title">Detalle de Cuenta</h2>
            </div>
          </div>
          <button className="dc-back-btn" onClick={onVolver}>
            <span className="material-icons-outlined">arrow_back</span>
          </button>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="dc-main">

        {/* Título de cuenta */}
        <div className="dc-title-section">
          <p className="dc-label-gold">
            Resumen de {tieneMesa ? `Mesa · ${cuenta.mesas?.tipo ?? ''}` : 'Venta Directa'}
          </p>
          <h3 className="dc-account-name">
            {tieneCliente
              ? `Cuenta a nombre de: ${cuenta.clientes.nombre}`
              : tieneMesa
                ? `Mesa ${String(cuenta.mesas?.numero ?? '--').padStart(2, '0')} · Sin cliente asignado`
                : 'Venta Directa'}
          </h3>
          <div className="dc-meta-row">
            <span className="dc-meta-chip">
              <span className="material-icons-outlined">schedule</span>
              Abierta desde las {horaApertura}
            </span>
            {tieneMesa && (
              <span className="dc-meta-chip dc-meta-chip-gold">
                <span className="material-icons-outlined">table_restaurant</span>
                Mesa {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className={`dc-metrics ${!tieneMesa ? 'dc-metrics-single' : ''}`}>
          <div className="dc-metric-card">
            <div className="dc-metric-header">
              <span className="material-icons-outlined dc-metric-icon">account_balance_wallet</span>
              <p className="dc-metric-label">Total Acumulado</p>
            </div>
            <p className="dc-metric-value">{formatCOP(totalRedon)}</p>
            {totalExacto !== totalRedon && (
              <p className="dc-metric-hint">Redondeado de {formatCOP(totalExacto)}</p>
            )}
          </div>

          {tieneMesa && (
            <div className="dc-metric-card">
              <div className="dc-metric-header">
                <span className="material-icons-outlined dc-metric-icon">timer</span>
                <p className="dc-metric-label">Tiempo de Juego</p>
              </div>
              <p className="dc-metric-value dc-mono">{segundosAFormato(seg)}</p>
              <p className="dc-metric-hint">{horas}h {mins}m · {formatCOP(precioMinuto * 60)}/h</p>
            </div>
          )}
        </div>

        {/* Botón agregar productos */}
        <button className="dc-btn-agregar" onClick={onAgregarProductos}>
          <span className="material-icons-outlined">add_circle</span>
          <span>Agregar Productos a la Cuenta</span>
        </button>

        {/* Consumo detallado */}
        <div className="dc-consumo">
          <div className="dc-consumo-header">
            <h2 className="dc-consumo-title">Consumo Detallado</h2>
            <span className="dc-consumo-badge">
              {cargando ? '...' : `${totalItems} ítem${totalItems !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div className="dc-table-wrap">
            <table className="dc-table">
              <thead>
                <tr className="dc-thead-row">
                  <th>Producto</th>
                  <th className="dc-th-center">Cant.</th>
                  <th className="dc-th-right">Precio</th>
                  <th className="dc-th-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {/* Fila de tiempo de mesa */}
                {tieneMesa && (
                  <tr className="dc-tr dc-tr-mesa">
                    <td className="dc-td-nombre">
                      <div className="dc-td-nombre-inner">
                        <span className="dc-td-icon-wrap">
                          <span className="material-icons-outlined">timelapse</span>
                        </span>
                        <div>
                          <p className="dc-td-prod-name">
                            Tiempo Mesa {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}
                          </p>
                          <p className="dc-td-prod-sub">
                            {horas}h {mins}m · {formatCOP(precioMinuto * 60)}/h
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="dc-td-center">1</td>
                    <td className="dc-td-right dc-text-muted">
                      {formatCOP(precioMinuto * 60)}/h
                    </td>
                    <td className="dc-td-right dc-td-bold">{formatCOP(subtotalMesa)}</td>
                  </tr>
                )}

                {/* Items de productos */}
                {cargando ? (
                  <tr>
                    <td colSpan={4} className="dc-td-empty">
                      <span className="material-icons-outlined dc-empty-spin">autorenew</span>
                      Cargando consumo...
                    </td>
                  </tr>
                ) : itemsAgrupados.length === 0 && !tieneMesa ? (
                  <tr>
                    <td colSpan={4} className="dc-td-empty">
                      <span className="material-icons-outlined">shopping_cart</span>
                      Sin productos registrados aún.
                    </td>
                  </tr>
                ) : itemsAgrupados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="dc-td-empty dc-td-empty-small">
                      Sin productos añadidos.
                    </td>
                  </tr>
                ) : (
                  itemsAgrupados.map(item => (
                    <tr key={item.producto_id} className="dc-tr">
                      <td className="dc-td-nombre">
                        <div className="dc-td-nombre-inner">
                          <div className="dc-td-dot"></div>
                          <div>
                            <p className="dc-td-prod-name">{item.productos?.nombre ?? '--'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="dc-td-center">{item.cantidad}</td>
                      <td className="dc-td-right dc-text-muted">
                        {formatCOP(item.productos?.precio ?? 0)}
                      </td>
                      <td className="dc-td-right dc-td-bold">
                        {formatCOP(item.cantidad * (item.productos?.precio ?? 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="dc-tfoot-row">
                  <td colSpan={3} className="dc-tfoot-label">Total a Pagar</td>
                  <td className="dc-tfoot-total">{formatCOP(totalRedon)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer className="dc-footer">
        <div className="dc-footer-inner">
          <button className="dc-btn-cancelar" onClick={onVolver}>
            Cerrar
          </button>
          <button className="dc-btn-liquidar" onClick={onLiquidar}>
            <span className="material-icons-outlined">point_of_sale</span>
            Liquidar Cuenta
          </button>
        </div>
      </footer>

    </div>
  )
}

export default DetalleCuenta