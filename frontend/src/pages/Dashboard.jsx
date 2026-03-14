import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatMoney, formatDate, ecfTypeName, statusClass, statusText, dgiiStatusClass, dgiiStatusText } from '../utils/helpers';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/facturas/stats/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const d = data || { total: 0, creadas: 0, enviadas: 0, aceptadas: 0, rechazadas: 0, montoMes: 0, recientes: [] };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen del sistema de facturación electrónica</p>
        </div>
        <Link to="/nueva-factura" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
          Nueva Factura
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card green"><div className="stat-label">Total Facturas</div><div className="stat-value">{d.total}</div></div>
        <div className="stat-card blue"><div className="stat-label">Creadas</div><div className="stat-value">{d.creadas}</div></div>
        <div className="stat-card amber"><div className="stat-label">Enviadas</div><div className="stat-value">{d.enviadas}</div></div>
        <div className="stat-card green"><div className="stat-label">Aceptadas DGII</div><div className="stat-value">{d.aceptadas}</div></div>
        <div className="stat-card red"><div className="stat-label">Rechazadas</div><div className="stat-value">{d.rechazadas}</div></div>
        <div className="stat-card cyan"><div className="stat-label">Monto del Mes</div><div className="stat-value" style={{ fontSize: 22 }}>{formatMoney(d.montoMes)}</div></div>
      </div>

      <div className="card">
        <h3 className="section-title">Facturas Recientes</h3>
        {d.recientes && d.recientes.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>e-NCF</th><th>Tipo</th><th>Cliente</th><th>Fecha</th><th>Monto</th><th>Estado</th><th>DGII</th>
                </tr>
              </thead>
              <tbody>
                {d.recientes.map((f) => (
                  <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/facturas'}>
                    <td><code style={{ color: 'var(--accent-primary)', fontSize: 12 }}>{f.encf || '—'}</code></td>
                    <td>{ecfTypeName(f.tipo_ecf)}</td>
                    <td>{f.cliente_nombre || '—'}</td>
                    <td>{formatDate(f.fecha_emision)}</td>
                    <td className="amount">{formatMoney(f.monto_total)}</td>
                    <td><span className={`badge ${statusClass(f.estado)}`}>{statusText(f.estado)}</span></td>
                    <td><span className={`badge ${dgiiStatusClass(f.estado_dgii)}`}>{dgiiStatusText(f.estado_dgii)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>Sin facturas aún</h3>
            <p>Crea tu primera factura electrónica</p>
            <Link to="/nueva-factura" className="btn btn-primary">Crear Factura</Link>
          </div>
        )}
      </div>
    </div>
  );
}
