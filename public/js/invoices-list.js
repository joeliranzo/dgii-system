/* ═══════════════════════════════════════════
   Invoices List Page
   ═══════════════════════════════════════════ */

const InvoicesList = {
  async render(container) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h2>Facturas</h2>
            <p>Gestión de comprobantes fiscales electrónicos</p>
          </div>
          <a href="#/nueva-factura" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
            Nueva Factura
          </a>
        </div>

        <div class="filters-bar">
          <select class="form-select" id="filter-estado" onchange="InvoicesList.load()">
            <option value="">Todos los estados</option>
            <option value="creada">Creada</option>
            <option value="enviada">Enviada</option>
          </select>
          <select class="form-select" id="filter-tipo" onchange="InvoicesList.load()">
            <option value="">Todos los tipos</option>
            <option value="31">31 — Crédito Fiscal</option>
            <option value="32">32 — Consumo</option>
            <option value="33">33 — Nota de Débito</option>
            <option value="34">34 — Nota de Crédito</option>
          </select>
        </div>

        <div class="card">
          <div id="invoices-table-body">
            <div class="loader"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    `;

    this.load();
  },

  async load() {
    try {
      const estado = document.getElementById('filter-estado')?.value || '';
      const tipo = document.getElementById('filter-tipo')?.value || '';
      let url = '/facturas?limit=100';
      if (estado) url += `&estado=${estado}`;
      if (tipo) url += `&tipo_ecf=${tipo}`;

      const data = await App.api('GET', url);
      this.renderTable(data.facturas || []);
    } catch (err) {
      document.getElementById('invoices-table-body').innerHTML =
        `<div class="empty-state"><h3>Error cargando facturas</h3><p>${err.message}</p></div>`;
    }
  },

  renderTable(facturas) {
    const body = document.getElementById('invoices-table-body');

    if (facturas.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <h3>No hay facturas</h3>
          <p>Crea tu primera factura electrónica</p>
          <a href="#/nueva-factura" class="btn btn-primary btn-sm">Crear Factura</a>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>e-NCF</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Monto Total</th>
              <th>Estado</th>
              <th>DGII</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${facturas.map(f => `
              <tr>
                <td><code style="color:var(--accent-primary);font-size:12px;font-weight:600">${f.encf || '—'}</code></td>
                <td><span class="badge badge-purple">${App.ecfTypeName(f.tipo_ecf)}</span></td>
                <td>${f.cliente_nombre || '<span style="color:var(--text-muted)">Consumo</span>'}</td>
                <td>${App.formatDate(f.fecha_emision)}</td>
                <td class="amount">${App.formatMoney(f.monto_total)}</td>
                <td>${App.statusBadge(f.estado)}</td>
                <td>${App.dgiiStatusBadge(f.estado_dgii)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn-icon" title="Ver XML" onclick="InvoicesList.viewXml(${f.id})">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    </button>
                    ${f.estado === 'creada' ? `
                      <button class="btn btn-primary btn-sm" onclick="InvoicesList.sendToDgii(${f.id})" title="Enviar a DGII">Enviar</button>
                    ` : ''}
                    ${f.estado === 'enviada' ? `
                      <button class="btn btn-blue btn-sm" onclick="InvoicesList.checkStatus(${f.id})" title="Consultar estado">Consultar</button>
                    ` : ''}
                    ${f.estado === 'creada' || f.estado === 'borrador' ? `
                      <button class="btn-icon" title="Eliminar" onclick="InvoicesList.deleteInvoice(${f.id})" style="color:var(--accent-red)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async viewXml(id) {
    try {
      const data = await App.api('GET', `/facturas/${id}`);
      const xml = data.factura.xml_generado || 'No se ha generado XML aún';
      const escaped = xml.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      App.openModal(`XML — ${data.factura.encf}`, `<pre class="xml-preview">${escaped}</pre>`);
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async sendToDgii(id) {
    try {
      const result = await App.api('POST', `/facturas/${id}/enviar`);
      App.toast(result.message);
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async checkStatus(id) {
    try {
      const result = await App.api('POST', `/facturas/${id}/consultar`);
      App.toast(`Estado DGII: ${result.status} — ${result.message}`, result.status === 'Rechazado' ? 'error' : 'success');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async deleteInvoice(id) {
    if (!confirm('¿Estás seguro de eliminar esta factura?')) return;
    try {
      await App.api('DELETE', `/facturas/${id}`);
      App.toast('Factura eliminada');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
