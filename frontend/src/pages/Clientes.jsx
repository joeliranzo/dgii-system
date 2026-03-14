import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAppToast } from '../App';
import Modal from '../components/Modal';

export default function Clientes() {
  const toast = useAppToast();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const searchTimer = useRef(null);

  const load = (q = '') => {
    setLoading(true);
    let url = '/clientes';
    if (q) url += `?search=${encodeURIComponent(q)}`;
    api.get(url)
      .then((r) => setClientes(r.data.clientes || []))
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSearch = (value) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(value), 300);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/clientes', {
        rnc_cedula: fd.get('rnc'), razon_social: fd.get('razon'), nombre_comercial: fd.get('comercial'),
        direccion: fd.get('dir'), municipio: fd.get('mun'), provincia: fd.get('prov'),
        telefono: fd.get('tel'), correo: fd.get('email'),
      });
      toast('Cliente creado exitosamente');
      setShowForm(false);
      load(search);
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.put(`/clientes/${editClient.id}`, {
        razon_social: fd.get('razon'), direccion: fd.get('dir'),
        telefono: fd.get('tel'), correo: fd.get('email'),
      });
      toast('Cliente actualizado');
      setEditClient(null);
      load(search);
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast('Cliente eliminado');
      load(search);
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h2>Clientes</h2><p>Gestión de clientes y compradores</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Nuevo Cliente
        </button>
      </div>

      <div className="filters-bar">
        <input type="text" className="form-input" placeholder="Buscar por RNC o razón social..." value={search} onChange={(e) => onSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : clientes.length === 0 ? (
        <div className="card"><div className="empty-state"><h3>No hay clientes registrados</h3><p>Agrega tu primer cliente para facturar</p><button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>Agregar Cliente</button></div></div>
      ) : (
        <div className="client-grid">
          {clientes.map((c) => (
            <div key={c.id} className="client-card">
              <h4>{c.razon_social}</h4>
              <div className="rnc">{c.rnc_cedula}</div>
              <div className="client-info">
                {c.direccion && <>📍 {c.direccion}<br /></>}
                {c.telefono && <>📞 {c.telefono}<br /></>}
                {c.correo && <>✉️ {c.correo}</>}
              </div>
              <div className="client-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setEditClient(c)}>Editar</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="Nuevo Cliente" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">RNC / Cédula *</label><input name="rnc" type="text" className="form-input" required placeholder="101010101" /></div>
              <div className="form-group"><label className="form-label">Razón Social *</label><input name="razon" type="text" className="form-input" required placeholder="Empresa SRL" /></div>
            </div>
            <div className="form-group"><label className="form-label">Nombre Comercial</label><input name="comercial" type="text" className="form-input" placeholder="Nombre comercial (opcional)" /></div>
            <div className="form-group"><label className="form-label">Dirección</label><input name="dir" type="text" className="form-input" placeholder="Dirección" /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Municipio</label><input name="mun" type="text" className="form-input" placeholder="Municipio" /></div>
              <div className="form-group"><label className="form-label">Provincia</label><input name="prov" type="text" className="form-input" placeholder="Provincia" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Teléfono</label><input name="tel" type="text" className="form-input" placeholder="809-000-0000" /></div>
              <div className="form-group"><label className="form-label">Correo</label><input name="email" type="email" className="form-input" placeholder="correo@empresa.com" /></div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Cliente</button>
            </div>
          </form>
        </Modal>
      )}

      {editClient && (
        <Modal title="Editar Cliente" onClose={() => setEditClient(null)}>
          <form onSubmit={handleUpdate}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">RNC / Cédula</label><input type="text" className="form-input" value={editClient.rnc_cedula} disabled style={{ opacity: 0.6 }} /></div>
              <div className="form-group"><label className="form-label">Razón Social *</label><input name="razon" type="text" className="form-input" required defaultValue={editClient.razon_social} /></div>
            </div>
            <div className="form-group"><label className="form-label">Dirección</label><input name="dir" type="text" className="form-input" defaultValue={editClient.direccion} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Teléfono</label><input name="tel" type="text" className="form-input" defaultValue={editClient.telefono} /></div>
              <div className="form-group"><label className="form-label">Correo</label><input name="email" type="email" className="form-input" defaultValue={editClient.correo} /></div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditClient(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Actualizar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
