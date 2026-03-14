import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatMoney } from '../utils/helpers';
import { useAppToast } from '../App';
import Modal from '../components/Modal';

export default function NuevaFactura() {
  const toast = useAppToast();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [tipoEcf, setTipoEcf] = useState('31');
  const [tipoPago, setTipoPago] = useState('1');
  const [fechaVencimiento, setFechaVencimiento] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [clienteId, setClienteId] = useState('');
  const [referenciaEncf, setReferenciaEncf] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([{ descripcion: '', cantidad: 1, unidad_medida: 'UND', precio_unitario: 0, tasa_itbis: 18, descuento_porcentaje: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [qc, setQc] = useState({ rnc: '', razon: '', tel: '', email: '' });

  useEffect(() => {
    api.get('/clientes').then((r) => setClientes(r.data.clientes || [])).catch(() => {});
  }, []);

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item };
      if (['cantidad', 'precio_unitario', 'tasa_itbis', 'descuento_porcentaje'].includes(field)) {
        updated[field] = Number(value);
      } else {
        updated[field] = value;
      }
      return updated;
    }));
  };

  const addItem = () => setItems((prev) => [...prev, { descripcion: '', cantidad: 1, unidad_medida: 'UND', precio_unitario: 0, tasa_itbis: 18, descuento_porcentaje: 0 }]);

  const removeItem = (idx) => { if (items.length > 1) setItems((prev) => prev.filter((_, i) => i !== idx)); };

  const calcTotals = () => {
    let subtotal = 0, descuento = 0, itbis18 = 0, itbis16 = 0;
    for (const item of items) {
      const base = (item.cantidad || 0) * (item.precio_unitario || 0);
      const desc = base * ((item.descuento_porcentaje || 0) / 100);
      const gravable = base - desc;
      subtotal += base;
      descuento += desc;
      if (item.tasa_itbis === 18) itbis18 += gravable * 0.18;
      else if (item.tasa_itbis === 16) itbis16 += gravable * 0.16;
    }
    return { subtotal, descuento, itbis18, itbis16, total: subtotal - descuento + itbis18 + itbis16 };
  };

  const totals = calcTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.descripcion && i.precio_unitario > 0);
    if (validItems.length === 0) { toast('Agrega al menos un ítem con descripción y precio', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/facturas', {
        tipo_ecf: Number(tipoEcf), cliente_id: clienteId || null, tipo_pago: Number(tipoPago),
        fecha_vencimiento: fechaVencimiento, referencia_encf: referenciaEncf, notas, items: validItems,
      });
      toast(`Factura ${res.data.encf} creada exitosamente`);
      navigate('/facturas');
    } catch (err) {
      toast(err.response?.data?.message || err.message, 'error');
    } finally { setSubmitting(false); }
  };

  const saveQuickClient = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/clientes', { rnc_cedula: qc.rnc, razon_social: qc.razon, telefono: qc.tel, correo: qc.email });
      toast('Cliente creado');
      setShowQuickClient(false);
      const r = await api.get('/clientes');
      setClientes(r.data.clientes || []);
      setClienteId(String(res.data.id));
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h2>Nueva Factura</h2><p>Crear un nuevo comprobante fiscal electrónico</p></div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Datos del Comprobante</h3>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Tipo de e-CF</label>
              <select className="form-select" value={tipoEcf} onChange={(e) => setTipoEcf(e.target.value)} required>
                <option value="31">31 — Crédito Fiscal</option>
                <option value="32">32 — Consumo</option>
                <option value="33">33 — Nota de Débito</option>
                <option value="34">34 — Nota de Crédito</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Forma de Pago</label>
              <select className="form-select" value={tipoPago} onChange={(e) => setTipoPago(e.target.value)}>
                <option value="1">Efectivo</option>
                <option value="2">Cheque / Transferencia</option>
                <option value="3">Tarjeta de Crédito / Débito</option>
                <option value="4">Venta a Crédito</option>
                <option value="5">Bonos o Certificados</option>
                <option value="6">Permuta</option>
                <option value="7">Nota de Crédito</option>
                <option value="8">Mixto</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Fecha Vencimiento</label>
              <input type="date" className="form-input" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
            </div>
          </div>
          {(tipoEcf === '33' || tipoEcf === '34') && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">e-NCF de Referencia (para NC/ND)</label>
                <input type="text" className="form-input" value={referenciaEncf} onChange={(e) => setReferenciaEncf(e.target.value)} placeholder="Ej: E310000000001" />
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Comprador</h3>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Cliente</label>
              <select className="form-select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">— Sin cliente (Consumo general) —</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.rnc_cedula} — {c.razon_social}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 0 auto' }}>
              <label className="form-label">&nbsp;</label>
              <button type="button" className="btn btn-secondary" onClick={() => setShowQuickClient(true)}>+ Nuevo Cliente</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="items-header">
            <h3 className="section-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Ítems de Factura</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Agregar Ítem</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700 }}>
              <div className="item-row" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 4 }}>
                <span className="form-label" style={{ margin: 0 }}>Descripción</span>
                <span className="form-label" style={{ margin: 0 }}>Cantidad</span>
                <span className="form-label" style={{ margin: 0 }}>Unidad</span>
                <span className="form-label" style={{ margin: 0 }}>Precio Unit.</span>
                <span className="form-label" style={{ margin: 0 }}>ITBIS %</span>
                <span className="form-label" style={{ margin: 0 }}>Subtotal</span>
                <span />
              </div>
              {items.map((item, i) => (
                <div key={i} className="item-row">
                  <input type="text" className="form-input" placeholder="Descripción del item" value={item.descripcion} onChange={(e) => updateItem(i, 'descripcion', e.target.value)} required />
                  <input type="number" className="form-input" min="0.01" step="0.01" value={item.cantidad} onChange={(e) => updateItem(i, 'cantidad', e.target.value)} />
                  <select className="form-select" value={item.unidad_medida} onChange={(e) => updateItem(i, 'unidad_medida', e.target.value)}>
                    {['UND', 'HRS', 'KG', 'LT', 'MT', 'SERV'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" className="form-input" min="0" step="0.01" value={item.precio_unitario} onChange={(e) => updateItem(i, 'precio_unitario', e.target.value)} placeholder="0.00" />
                  <select className="form-select" value={item.tasa_itbis} onChange={(e) => updateItem(i, 'tasa_itbis', e.target.value)}>
                    <option value={18}>18%</option>
                    <option value={16}>16%</option>
                    <option value={0}>0%</option>
                  </select>
                  <span className="form-input" style={{ textAlign: 'right', background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                    {formatMoney((item.cantidad || 0) * (item.precio_unitario || 0))}
                  </span>
                  <button type="button" className="remove-item-btn" onClick={() => removeItem(i)} disabled={items.length === 1}>✕</button>
                </div>
              ))}
            </div>
          </div>
          <div className="invoice-totals">
            <div className="totals-box">
              <div className="total-row"><span>Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
              <div className="total-row"><span>Descuentos</span><span>{formatMoney(totals.descuento)}</span></div>
              <div className="total-row"><span>ITBIS (18%)</span><span>{formatMoney(totals.itbis18)}</span></div>
              <div className="total-row"><span>ITBIS (16%)</span><span>{formatMoney(totals.itbis16)}</span></div>
              <div className="total-row grand-total"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label className="form-label">Notas / Observaciones</label>
            <textarea className="form-textarea" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas opcionales..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/facturas')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creando...' : 'Crear Factura'}</button>
        </div>
      </form>

      {showQuickClient && (
        <Modal title="Nuevo Cliente" onClose={() => setShowQuickClient(false)}>
          <form onSubmit={saveQuickClient}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">RNC / Cédula</label><input type="text" className="form-input" value={qc.rnc} onChange={(e) => setQc({ ...qc, rnc: e.target.value })} required placeholder="101010101" /></div>
              <div className="form-group"><label className="form-label">Razón Social</label><input type="text" className="form-input" value={qc.razon} onChange={(e) => setQc({ ...qc, razon: e.target.value })} required placeholder="Empresa SRL" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={qc.tel} onChange={(e) => setQc({ ...qc, tel: e.target.value })} placeholder="809-000-0000" /></div>
              <div className="form-group"><label className="form-label">Correo</label><input type="email" className="form-input" value={qc.email} onChange={(e) => setQc({ ...qc, email: e.target.value })} placeholder="correo@empresa.com" /></div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowQuickClient(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
