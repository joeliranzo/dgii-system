/* ═══════════════════════════════════════════
   Settings Page
   ═══════════════════════════════════════════ */

const Settings = {
  async render(container) {
    try {
      const data = await App.api('GET', '/configuracion');
      const config = data.configuracion || {};
      const secuencias = data.secuencias || [];

      container.innerHTML = `
        <div class="fade-in">
          <div class="page-header">
            <div>
              <h2>Configuración</h2>
              <p>Datos del emisor y gestión de secuencias e-NCF</p>
            </div>
          </div>

          <!-- Emisor Config -->
          <div class="card" style="margin-bottom:24px">
            <h3 class="section-title">Datos del Emisor</h3>
            <form id="settings-form" onsubmit="Settings.save(event)">
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">RNC *</label>
                  <input type="text" class="form-input" id="s-rnc" value="${config.rnc || ''}" required placeholder="101672919">
                </div>
                <div class="form-group">
                  <label class="form-label">Razón Social *</label>
                  <input type="text" class="form-input" id="s-razon" value="${config.razon_social || ''}" required placeholder="Mi Empresa SRL">
                </div>
                <div class="form-group">
                  <label class="form-label">Nombre Comercial</label>
                  <input type="text" class="form-input" id="s-comercial" value="${config.nombre_comercial || ''}" placeholder="Nombre comercial">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Dirección</label>
                <input type="text" class="form-input" id="s-dir" value="${config.direccion || ''}" placeholder="Av. Principal #100, Local 2">
              </div>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">Municipio</label>
                  <input type="text" class="form-input" id="s-mun" value="${config.municipio || ''}" placeholder="Santo Domingo Este">
                </div>
                <div class="form-group">
                  <label class="form-label">Provincia</label>
                  <input type="text" class="form-input" id="s-prov" value="${config.provincia || ''}" placeholder="Santo Domingo">
                </div>
                <div class="form-group">
                  <label class="form-label">Actividad Económica</label>
                  <input type="text" class="form-input" id="s-actividad" value="${config.actividad_economica || ''}" placeholder="Venta de productos">
                </div>
              </div>
              <div class="form-row form-row-3">
                <div class="form-group">
                  <label class="form-label">Teléfono</label>
                  <input type="text" class="form-input" id="s-tel" value="${config.telefono || ''}" placeholder="809-000-0000">
                </div>
                <div class="form-group">
                  <label class="form-label">Correo Electrónico</label>
                  <input type="email" class="form-input" id="s-email" value="${config.correo || ''}" placeholder="info@empresa.com">
                </div>
                <div class="form-group">
                  <label class="form-label">Website</label>
                  <input type="text" class="form-input" id="s-web" value="${config.website || ''}" placeholder="www.empresa.com">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Entorno</label>
                  <select class="form-select" id="s-ambiente">
                    <option value="TesteCF" ${config.ambiente==='TesteCF'?'selected':''}>Pruebas (TesteCF)</option>
                    <option value="Produccion" ${config.ambiente==='Produccion'?'selected':''}>Producción</option>
                  </select>
                </div>
              </div>
              <div style="margin-top:16px;display:flex;justify-content:flex-end">
                <button type="submit" class="btn btn-primary">Guardar Configuración</button>
              </div>
            </form>
          </div>

          <!-- Sequences -->
          <div class="card">
            <h3 class="section-title">Secuencias e-NCF</h3>
            <p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px">
              Control de secuencias de numeración autorizadas por la DGII para cada tipo de comprobante.
            </p>
            <div class="sequences-grid">
              ${secuencias.map(s => `
                <div class="sequence-card">
                  <h4>
                    <span class="badge badge-purple">Tipo ${s.tipo_ecf}</span>
                    ${Settings.ecfName(s.tipo_ecf)}
                  </h4>
                  <div class="sequence-info">
                    <div class="info-row"><span>Serie</span><span>${s.serie}</span></div>
                    <div class="info-row"><span>Rango</span><span>${s.secuencia_desde.toLocaleString()} — ${s.secuencia_hasta.toLocaleString()}</span></div>
                    <div class="info-row"><span>Actual</span><span style="color:var(--accent-primary);font-weight:700">${s.secuencia_actual.toLocaleString()}</span></div>
                    <div class="info-row"><span>Disponibles</span><span>${s.disponibles.toLocaleString()}</span></div>
                    <div class="info-row"><span>Uso</span><span>${s.porcentaje_uso}%</span></div>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-bar-fill" style="width:${Math.min(s.porcentaje_uso, 100)}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="card"><div class="empty-state"><h3>Error</h3><p>${err.message}</p></div></div>`;
    }
  },

  async save(event) {
    event.preventDefault();
    try {
      await App.api('PUT', '/configuracion', {
        rnc: document.getElementById('s-rnc').value,
        razon_social: document.getElementById('s-razon').value,
        nombre_comercial: document.getElementById('s-comercial').value,
        direccion: document.getElementById('s-dir').value,
        municipio: document.getElementById('s-mun').value,
        provincia: document.getElementById('s-prov').value,
        telefono: document.getElementById('s-tel').value,
        correo: document.getElementById('s-email').value,
        website: document.getElementById('s-web').value,
        actividad_economica: document.getElementById('s-actividad').value,
        ambiente: document.getElementById('s-ambiente').value
      });
      App.toast('Configuración guardada exitosamente');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  ecfName(tipo) {
    const names = { 31: 'Crédito Fiscal', 32: 'Consumo', 33: 'Nota de Débito', 34: 'Nota de Crédito' };
    return names[tipo] || `Tipo ${tipo}`;
  }
};
