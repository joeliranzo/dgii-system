import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatMoney, formatDate, ecfTypeName, statusClass, statusText, dgiiStatusClass, dgiiStatusText } from '../utils/helpers';
import { useAppToast } from '../App';
import Modal from '../components/Modal';

export default function Facturas() {
  const toast = useAppToast();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [xmlModal, setXmlModal] = useState(null);

  const load = () => {
    setLoading(true);
    let url = '/facturas?limit=100';
    if (filterEstado) url += `&estado=${filterEstado}`;
    if (filterTipo) url += `&tipo_ecf=${filterTipo}`;
    api.get(url)
      .then((res) => setFacturas(res.data.facturas || []))
      .catch((err) => toast(err.response?.data?.message || err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterEstado, filterTipo]);

  const viewXml = async (id) => {
    try {
      const res = await api.get(`/facturas/${id}`);
      setXmlModal({ encf: res.data.factura.encf, xml: res.data.factura.xml_generado || 'No se ha generado XML aún' });
    } catch (err) { toast(err.message, 'error'); }
  };

  const sendToDgii = async (id) => {
    try {
      const res = await api.post(`/facturas/${id}/enviar`);
      toast(res.data.message);
      load();
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  const checkStatus = async (id) => {
    try {
      const res = await api.post(`/facturas/${id}/consultar`);
      toast(`Estado DGII: ${res.data.status} — ${res.data.message}`, res.data.status === 'Rechazado' ? 'error' : 'success');
      load();
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta factura?')) return;
    try {
      await api.delete(`/facturas/${id}`);
      toast('Factura eliminada');
      load();
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Facturas</h2>
          <p>Gestión de comprobantes fiscales electrónicos</p>
        </div>
        <Link to="/nueva-factura" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Nueva Factura
        </Link>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="creada">Creada</option>
          <option value="enviada">Enviada</option>
        </select>
        <select className="form-select" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="31">31 — Crédito Fiscal</option>
          <option value="32">32 — Consumo</option>
          <option value="33">33 — Nota de Débito</option>
          <option value="34">34 — Nota de Crédito</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : facturas.length === 0 ? (
          <div className="empty-state">
            <h3>No hay facturas</h3>
            <p>Crea tu primera factura electrónica</p>
            <Link to="/nueva-factura" className="btn btn-primary btn-sm">Crear Factura</Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>e-NCF</th><th>Tipo</th><th>Cliente</th><th>Fecha</th><th>Monto Total</th><th>Estado</th><th>DGII</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id}>
                    <td><code style={{ color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600 }}>{f.encf || '—'}</code></td>
                    <td><span className="badge badge-purple">{ecfTypeName(f.tipo_ecf)}</span></td>
                    <td>{f.cliente_nombre || <span style={{ color: 'var(--text-muted)' }}>Consumo</span>}</td>
                    <td>{formatDate(f.fecha_emision)}</td>
                    <td className="amount">{formatMoney(f.monto_total)}</td>
                    <td><span className={`badge ${statusClass(f.estado)}`}>{statusText(f.estado)}</span></td>
                    <td><span className={`badge ${dgiiStatusClass(f.estado_dgii)}`}>{dgiiStatusText(f.estado_dgii)}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon" title="Ver XML" onClick={() => viewXml(f.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                        </button>
                        {f.estado === 'creada' && <button className="btn btn-primary btn-sm" onClick={() => sendToDgii(f.id)}>Enviar</button>}
                        {f.estado === 'enviada' && <button className="btn btn-blue btn-sm" onClick={() => checkStatus(f.id)}>Consultar</button>}
                        {(f.estado === 'creada' || f.estado === 'borrador') && (
                          <button className="btn-icon" title="Eliminar" onClick={() => deleteInvoice(f.id)} style={{ color: 'var(--accent-red)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {xmlModal && (
        <Modal title={`XML — ${xmlModal.encf}`} onClose={() => setXmlModal(null)}>
          <pre className="xml-preview">{xmlModal.xml}</pre>
        </Modal>
      )}
    </div>
  );
}
