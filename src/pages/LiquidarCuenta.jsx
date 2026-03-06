import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './LiquidarCuenta.css'
import jsPDF from 'jspdf'

const formatCOP = (val) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)

function redondear50(val) {
  return Math.round(val / 50) * 50
}

const METODOS = [
  { key: 'efectivo',  label: 'Efectivo',   icon: 'payments',               bg: 'bg-yellow-100', color: 'text-yellow-700' },
  { key: 'nequi',     label: 'Nequi',      icon: 'account_balance_wallet', bg: 'bg-purple-100', color: 'text-purple-700' },
  { key: 'daviplata', label: 'Daviplata',  icon: 'account_balance',        bg: 'bg-pink-100',   color: 'text-pink-700'   },
  { key: 'bold',      label: 'Bold',       icon: 'point_of_sale',          bg: 'bg-slate-100',  color: 'text-slate-700'  },
]

function LiquidarCuenta({ cuenta, itemsAgrupados, segTranscurridos, onVolver, onLiquidado }) {
  const mesaId       = cuenta.mesa_id ?? cuenta.mesas?.id  // ← fix clave
  const precioMinuto = cuenta.mesas?.precio_minuto ?? 0
  const subtotalMesa = (segTranscurridos / 60) * precioMinuto
  const subtotalProd = cuenta.subtotal_productos ?? 0
  const totalExacto  = subtotalMesa + subtotalProd
  const totalRedon   = redondear50(totalExacto)

  const horas = Math.floor(segTranscurridos / 3600)
  const mins  = Math.floor((segTranscurridos % 3600) / 60)

  const [metodo, setMetodo]         = useState('efectivo')
  const [recibido, setRecibido]     = useState('')
  const [liquidando, setLiquidando] = useState(false)
  const [errorMsg, setErrorMsg]     = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [pdfUrl, setPdfUrl]         = useState(null)

  const recibidoNum = parseInt(recibido.replace(/\D/g, '') || '0', 10)
  const cambio      = recibidoNum - totalRedon

  const handleTecla = (tecla) => {
    if (tecla === 'C') { setRecibido(''); return }
    if (tecla === '⌫') { setRecibido(prev => prev.slice(0, -1)); return }
    const raw = (recibido + tecla).replace(/\D/g, '')
    if (raw.length > 10) return
    setRecibido(parseInt(raw, 10).toLocaleString('es-CO'))
  }

  const abrirModal = () => {
    if (metodo === 'efectivo' && recibidoNum < totalRedon) {
      setErrorMsg('El dinero recibido es menor al total.')
      return
    }
    setErrorMsg(null)
    setShowModal(true)
  }

  const handleConfirmarLiquidar = async () => {
    setShowModal(false)
    setLiquidando(true)
    setErrorMsg(null)

    // ── 1. Cerrar cuenta ──
    try {
      const { error } = await supabase
        .from('cuentas')
        .update({
          estado:          'liquidada',
          metodo_pago:     metodo,
          hora_cierre:     new Date().toISOString(),
          subtotal_tiempo: subtotalMesa
        })
        .eq('id', cuenta.id)

      if (error) {
        setErrorMsg(`Error: ${error.message}`)
        setLiquidando(false)
        return
      }
    } catch (e) {
      setErrorMsg('Error de conexión')
      setLiquidando(false)
      return
    }

    // ── 2. Reset mesa (con mesaId resuelto) ──
    if (mesaId) {
      try {
        const { error: rpcError } = await supabase
          .rpc('reset_mesa', { p_mesa_id: mesaId })

        if (rpcError) {
          // Plan B: update directo
          await supabase
            .from('mesas')
            .update({ en_uso: false, hora_inicio: null, cliente_nombre: null })
            .eq('id', mesaId)
        }
      } catch (e) {
        console.error('Error reset mesa:', e)
      }
    }

    // ── 3. Generar PDF ──
    generarPDF()
    setLiquidando(false)
  }

  const handleCerrarPdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    onLiquidado()
  }

  const generarPDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: [58, 420] })
    const marginX = 4
    let y = 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('CLUB DE BILLAR', 29, y, { align: 'center' })
    y += 5
    doc.setFontSize(9)
    doc.text('DE LA SABANA', 29, y, { align: 'center' })
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Factura de Consumo', 29, y, { align: 'center' })
    y += 6

    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-CO')
    const hora  = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    doc.setFontSize(6.5)
    doc.text(`Fecha: ${fecha}  Hora: ${hora}`, marginX, y)
    y += 4
    doc.text(`Mesa Nº: ${String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}`, marginX, y)
    y += 4

    if (cuenta.clientes?.nombre) {
      doc.setFont('helvetica', 'bold')
      doc.text(`Cliente: ${cuenta.clientes.nombre}`, marginX, y)
      doc.setFont('helvetica', 'normal')
      y += 5
    } else {
      y += 3
    }

    doc.setLineWidth(0.3)
    doc.line(marginX, y, 54, y)
    y += 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text('DESCRIPCIÓN', marginX, y)
    doc.text('TOTAL', 54, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    y += 2
    doc.setLineWidth(0.1)
    doc.line(marginX, y, 54, y)
    y += 4

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`Tiempo Mesa ${String(cuenta.mesas?.numero ?? '--').padStart(2, '0')}`, marginX, y)
    doc.setFont('helvetica', 'normal')
    y += 3
    doc.text(`  ${horas}h ${mins}m  ×  ${formatCOP(precioMinuto * 60)}/h`, marginX, y)
    doc.text(formatCOP(subtotalMesa), 54, y, { align: 'right' })
    y += 5

    if (itemsAgrupados.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.text('Consumo de Productos', marginX, y)
      doc.setFont('helvetica', 'normal')
      y += 4

      itemsAgrupados.forEach(item => {
        const nombre = item.productos?.nombre ?? 'Producto'
        const cant   = item.cantidad
        const precio = item.productos?.precio ?? 0
        doc.setFont('helvetica', 'bold')
        doc.text(`${cant}x ${nombre}`, marginX, y)
        doc.setFont('helvetica', 'normal')
        y += 3
        doc.text(`  ${formatCOP(precio)} c/u`, marginX, y)
        doc.text(formatCOP(cant * precio), 54, y, { align: 'right' })
        y += 5
      })
    }

    doc.setLineWidth(0.2)
    doc.line(marginX, y, 54, y)
    y += 4

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal Mesa:', marginX, y)
    doc.text(formatCOP(subtotalMesa), 54, y, { align: 'right' })
    y += 4

    if (subtotalProd > 0) {
      doc.text('Subtotal Productos:', marginX, y)
      doc.text(formatCOP(subtotalProd), 54, y, { align: 'right' })
      y += 4
    }

    doc.setLineWidth(0.4)
    doc.line(marginX, y, 54, y)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('TOTAL:', marginX, y)
    doc.text(formatCOP(totalRedon), 54, y, { align: 'right' })
    y += 7

    const metodoPago = METODOS.find(m => m.key === metodo)?.label ?? metodo
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(`Método de pago: ${metodoPago}`, marginX, y)
    y += 4

    if (metodo === 'efectivo') {
      doc.text(`Recibido: ${formatCOP(recibidoNum)}`, marginX, y)
      y += 4
      doc.setFont('helvetica', 'bold')
      doc.text(`Cambio:   ${formatCOP(cambio)}`, marginX, y)
      doc.setFont('helvetica', 'normal')
      y += 6
    } else {
      y += 3
    }

    doc.setLineWidth(0.2)
    doc.line(marginX, y, 54, y)
    y += 4
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6)
    doc.text('¡Gracias por su visita!', 29, y, { align: 'center' })
    y += 3
    doc.text('Club de Billar de la Sabana', 29, y, { align: 'center' })

    const url = URL.createObjectURL(doc.output('blob'))
    setPdfUrl(url)
  }

  return (
    <div className="lq-root">

      {/* ── MODAL VISOR PDF ── */}
      {pdfUrl && (
        <div className="lq-pdf-overlay">
          <div className="lq-pdf-modal">
            <div className="lq-pdf-modal-header">
              <div className="lq-pdf-modal-titulo">
                <span className="material-icons-outlined lq-pdf-ok-icon">check_circle</span>
                <div>
                  <h3>¡Cuenta Liquidada!</h3>
                  <p>Mesa {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')} • {METODOS.find(m => m.key === metodo)?.label}</p>
                </div>
              </div>
              <div className="lq-pdf-modal-acciones">
                <a href={pdfUrl} download={`factura-mesa-${cuenta.mesas?.numero ?? cuenta.id}.pdf`} className="lq-pdf-btn-descargar">
                  <span className="material-icons-outlined">download</span>
                  Descargar
                </a>
                <button className="lq-pdf-btn-cerrar" onClick={handleCerrarPdf}>
                  <span className="material-icons-outlined">close</span>
                  Cerrar y volver
                </button>
              </div>
            </div>
            <iframe src={pdfUrl} className="lq-pdf-iframe" title="Factura de consumo" />
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMACIÓN ── */}
      {showModal && (
        <div className="lq-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lq-modal" onClick={e => e.stopPropagation()}>
            <div className="lq-modal-icon">
              <span className="material-icons-outlined">receipt_long</span>
            </div>
            <h3 className="lq-modal-title">Confirmar Liquidación</h3>
            <p className="lq-modal-desc">
              ¿Confirma el cobro de <strong>{formatCOP(totalRedon)}</strong>?
            </p>
            <p className="lq-modal-hint">
              Se cerrará la mesa y se generará la factura automáticamente.
            </p>
            <div className="lq-modal-actions">
              <button className="lq-modal-cancel" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="lq-modal-confirm" onClick={handleConfirmarLiquidar} disabled={liquidando}>
                <span className="material-icons-outlined">check_circle</span>
                {liquidando ? 'Procesando...' : 'Confirmar y Generar Factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="lq-header">
        <button className="lq-volver-btn" onClick={onVolver}>
          <span className="material-icons-outlined">arrow_back</span>
          Volver
        </button>
        <div className="lq-header-info">
          <h1 className="lq-title">Liquidación de Cuenta</h1>
          <p className="lq-subtitle">Facturación • Club de Billar de la Sabana</p>
        </div>
      </header>

      <main className="lq-main">
        <section className="lq-left">
          <div className="lq-resumen">
            <h3 className="lq-section-title">Resumen de Cuenta</h3>

            {cuenta.clientes?.nombre && (
              <div className="lq-cliente">
                <span className="material-icons-outlined">person</span>
                <span>A nombre de: <strong>{cuenta.clientes.nombre}</strong></span>
              </div>
            )}

            <ul className="lq-items">
              <li className="lq-item">
                <span>
                  Tiempo Mesa {String(cuenta.mesas?.numero ?? '--').padStart(2, '0')} ({horas}h {mins}m)
                </span>
                <span>{formatCOP(subtotalMesa)}</span>
              </li>
              {itemsAgrupados.map(item => (
                <li key={item.producto_id} className="lq-item">
                  <span>{item.cantidad}x {item.productos?.nombre}</span>
                  <span>{formatCOP(item.cantidad * item.productos?.precio)}</span>
                </li>
              ))}
            </ul>

            <div className="lq-total-box">
              <span className="lq-total-label">Total a Pagar</span>
              <span className="lq-total-valor">{formatCOP(totalRedon)}</span>
            </div>
          </div>

          <div className="lq-metodos">
            <h3 className="lq-section-title">Método de Pago</h3>
            <div className="lq-metodos-grid">
              {METODOS.map(m => (
                <button
                  key={m.key}
                  className={`lq-metodo-btn ${metodo === m.key ? 'lq-metodo-active' : ''}`}
                  onClick={() => setMetodo(m.key)}
                >
                  <div className={`lq-metodo-icon ${m.bg} ${m.color}`}>
                    <span className="material-icons-outlined">{m.icon}</span>
                  </div>
                  <span className="lq-metodo-label">{m.label}</span>
                  {metodo === m.key && (
                    <span className="material-icons-outlined lq-metodo-check">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="lq-right">
          <div className="lq-teclado-panel">
            <div className="lq-recibido-box">
              <label className="lq-recibido-label">Dinero Recibido</label>
              <div className="lq-recibido-input">
                <span className="lq-recibido-signo">$</span>
                <span className="lq-recibido-valor">
                  {recibido || <span className="lq-recibido-placeholder">0</span>}
                </span>
              </div>
            </div>

            {metodo === 'efectivo' && (
              <div className="lq-cambio-row">
                <span className="lq-cambio-label">Cambio a devolver:</span>
                <span className={`lq-cambio-valor ${cambio >= 0 ? 'lq-cambio-ok' : 'lq-cambio-neg'}`}>
                  {cambio >= 0 ? formatCOP(cambio) : '—'}
                </span>
              </div>
            )}
          </div>

          <div className="lq-teclado">
            {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(t => (
              <button
                key={t}
                className={`lq-tecla ${t === 'C' || t === '⌫' ? 'lq-tecla-special' : ''}`}
                onClick={() => handleTecla(t)}
              >
                {t === '⌫'
                  ? <span className="material-icons-outlined">backspace</span>
                  : t
                }
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="lq-error">
              <span className="material-icons-outlined">error</span>
              {errorMsg}
            </div>
          )}

          <div className="lq-acciones">
            <button
              className="lq-btn-confirmar"
              onClick={abrirModal}
              disabled={liquidando || (metodo === 'efectivo' && recibidoNum < totalRedon)}
            >
              <span className="material-icons-outlined">
                {liquidando ? 'hourglass_top' : 'receipt_long'}
              </span>
              {liquidando ? 'Procesando...' : 'Confirmar Liquidación'}
            </button>
            <button className="lq-btn-cancelar" onClick={onVolver} disabled={liquidando}>
              Cancelar
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LiquidarCuenta
