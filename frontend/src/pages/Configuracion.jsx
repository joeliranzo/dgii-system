import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAppToast } from '../App';

const ecfName = (tipo) => ({ 31: 'Crédito Fiscal', 32: 'Consumo', 33: 'Nota de Débito', 34: 'Nota de Crédito' }[tipo] || `Tipo ${tipo}`);

export default function Configuracion() {
  const toast = useAppToast();
  const [config, setConfig] = useState({});
  const [secuencias, setSecuencias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/configuracion')
      .then((r) => { setConfig(r.data.configuracion || {}); setSecuencias(r.data.secuencias || []); })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/configuracion', config);
      toast('Configuración guardada exitosamente');
    } catch (err) { toast(err.response?.data?.message || err.message, 'error'); }
  };

  const updateField = (field, value) => setConfig((prev) => ({ ...prev, [field]: value }));

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><h2>Configuración</h2><p>Datos del emisor y gestión de secuencias e-NCF</p></div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Datos del Emisor</h3>
        <form onSubmit={handleSave}>
          <div className="form-row form-row-3">
            <div className="form-group"><label className="form-label">RNC *</label><input type="text" className="form-input" value={config.rnc || ''} onChange={(e) => updateField('rnc', e.target.value)} required placeholder="101672919" /></div>
            <div className="form-group"><label className="form-label">Razón Social *</label><input type="text" className="form-input" value={config.razon_social || ''} onChange={(e) => updateField('razon_social', e.target.value)} required placeholder="Mi Empresa SRL" /></div>
            <div className="form-group"><label className="form-label">Nombre Comercial</label><input type="text" className="form-input" value={config.nombre_comercial || ''} onChange={(e) => updateField('nombre_comercial', e.target.value)} placeholder="Nombre comercial" /></div>
          </div>
          <div className="form-group"><label className="form-label">Dirección</label><input type="text" className="form-input" value={config.direccion || ''} onChange={(e) => updateField('direccion', e.target.value)} placeholder="Av. Principal #100, Local 2" /></div>
          <div className="form-row form-row-3">
            <div className="form-group"><label className="form-label">Municipio</label><input type="text" className="form-input" value={config.municipio || ''} onChange={(e) => updateField('municipio', e.target.value)} placeholder="Santo Domingo Este" /></div>
            <div className="form-group"><label className="form-label">Provincia</label><input type="text" className="form-input" value={config.provincia || ''} onChange={(e) => updateField('provincia', e.target.value)} placeholder="Santo Domingo" /></div>
            <div className="form-group"><label className="form-label">Actividad Económica</label><input type="text" className="form-input" value={config.actividad_economica || ''} onChange={(e) => updateField('actividad_economica', e.target.value)} placeholder="Venta de productos" /></div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group"><label className="form-label">Teléfono</label><input type="text" className="form-input" value={config.telefono || ''} onChange={(e) => updateField('telefono', e.target.value)} placeholder="809-000-0000" /></div>
            <div className="form-group"><label className="form-label">Correo Electrónico</label><input type="email" className="form-input" value={config.correo || ''} onChange={(e) => updateField('correo', e.target.value)} placeholder="info@empresa.com" /></div>
            <div className="form-group"><label className="form-label">Website</label><input type="text" className="form-input" value={config.website || ''} onChange={(e) => updateField('website', e.target.value)} placeholder="www.empresa.com" /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Entorno</label>
              <select className="form-select" value={config.ambiente || 'TesteCF'} onChange={(e) => updateField('ambiente', e.target.value)}>
                <option value="TesteCF">Pruebas (TesteCF)</option>
                <option value="Produccion">Producción</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Guardar Configuración</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Secuencias e-NCF</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 20 }}>
          Control de secuencias de numeración autorizadas por la DGII para cada tipo de comprobante.
        </p>
        <div className="sequences-grid">
          {secuencias.map((s) => (
            <div key={s.id} className="sequence-card">
              <h4>
                <span className="badge badge-purple">Tipo {s.tipo_ecf}</span> {ecfName(s.tipo_ecf)}
              </h4>
              <div className="sequence-info">
                <div className="info-row"><span>Serie</span><span>{s.serie}</span></div>
                <div className="info-row"><span>Rango</span><span>{Number(s.secuencia_desde).toLocaleString()} — {Number(s.secuencia_hasta).toLocaleString()}</span></div>
                <div className="info-row"><span>Actual</span><span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{Number(s.secuencia_actual).toLocaleString()}</span></div>
                <div className="info-row"><span>Disponibles</span><span>{Number(s.disponibles).toLocaleString()}</span></div>
                <div className="info-row"><span>Uso</span><span>{s.porcentaje_uso}%</span></div>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${Math.min(s.porcentaje_uso, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
