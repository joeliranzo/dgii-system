/* ═══════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════ */

const Dashboard = {
  async render(container) {
    try {
      const data = await App.api('GET', '/facturas/stats/dashboard');

      container.innerHTML = `
        <div class="fade-in">
          <div class="page-header">
            <div>
              <h2>Dashboard</h2>
              <p>Resumen del sistema de facturación electrónica</p>
            </div>
            <a href="#/nueva-factura" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
              Nueva Factura
            </a>
          </div>

          <div class="stats-grid">
            <div class="stat-card green">
              <div class="stat-label">Total Facturas</div>
              <div class="stat-value">${data.total}</div>
            </div>
            <div class="stat-card blue">
              <div class="stat-label">Creadas</div>
              <div class="stat-value">${data.creadas}</div>
            </div>
            <div class="stat-card amber">
              <div class="stat-label">Enviadas</div>
              <div class="stat-value">${data.enviadas}</div>
            </div>
            <div class="stat-card green">
              <div class="stat-label">Aceptadas DGII</div>
              <div class="stat-value">${data.aceptadas}</div>
            </div>
            <div class="stat-card red">
              <div class="stat-label">Rechazadas</div>
              <div class="stat-value">${data.rechazadas}</div>
            </div>
            <div class="stat-card cyan">
              <div class="stat-label">Monto del Mes</div>
              <div class="stat-value" style="font-size:22px">${App.formatMoney(data.montoMes)}</div>
            </div>
          </div>

          <div class="recent-section">
            <div class="card">
              <h3 class="section-title">Facturas Recientes</h3>
              ${data.recientes && data.recientes.length > 0 ? `
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>e-NCF</th>
                        <th>Tipo</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Estado</th>
                        <th>DGII</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.recientes.map(f => `
                        <tr style="cursor:pointer" onclick="window.location.hash='#/facturas'">
                          <td><code style="color:var(--accent-primary);font-size:12px">${f.encf || '—'}</code></td>
                          <td>${App.ecfTypeName(f.tipo_ecf)}</td>
                          <td>${f.cliente_nombre || '—'}</td>
                          <td>${App.formatDate(f.fecha_emision)}</td>
                          <td class="amount">${App.formatMoney(f.monto_total)}</td>
                          <td>${App.statusBadge(f.estado)}</td>
                          <td>${App.dgiiStatusBadge(f.estado_dgii)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : `
                <div class="empty-state">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                  </svg>
                  <h3>Sin facturas aún</h3>
                  <p>Crea tu primera factura electrónica</p>
                  <a href="#/nueva-factura" class="btn btn-primary">Crear Factura</a>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="fade-in">
          <div class="page-header">
            <div>
              <h2>Dashboard</h2>
              <p>Resumen del sistema de facturación electrónica</p>
            </div>
            <a href="#/nueva-factura" class="btn btn-primary">Nueva Factura</a>
          </div>
          <div class="stats-grid">
            <div class="stat-card green"><div class="stat-label">Total Facturas</div><div class="stat-value">0</div></div>
            <div class="stat-card blue"><div class="stat-label">Creadas</div><div class="stat-value">0</div></div>
            <div class="stat-card amber"><div class="stat-label">Enviadas</div><div class="stat-value">0</div></div>
            <div class="stat-card green"><div class="stat-label">Aceptadas</div><div class="stat-value">0</div></div>
          </div>
          <div class="card">
            <div class="empty-state">
              <h3>Sin facturas aún</h3>
              <p>Crea tu primera factura electrónica</p>
              <a href="#/nueva-factura" class="btn btn-primary">Crear Factura</a>
            </div>
          </div>
        </div>
      `;
    }
  }
};
