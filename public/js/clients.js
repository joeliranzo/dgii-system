/* ═══════════════════════════════════════════
   Clients Page
   ═══════════════════════════════════════════ */

const Clients = {
  async render(container) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h2>Clientes</h2>
            <p>Gestión de clientes y compradores</p>
          </div>
          <button class="btn btn-primary" onclick="Clients.showForm()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
            Nuevo Cliente
          </button>
        </div>

        <div class="filters-bar">
          <input type="text" class="form-input" placeholder="Buscar por RNC o razón social..." id="client-search"
                 oninput="Clients.search(this.value)" style="max-width:360px">
        </div>

        <div id="clients-container">
          <div class="loader"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    this.load();
  },

  async load(search = '') {
    try {
      let url = '/clientes';
      if (search) url += `?search=${encodeURIComponent(search)}`;
      const data = await App.api('GET', url);
      this.renderClients(data.clientes || []);
    } catch (err) {
      document.getElementById('clients-container').innerHTML =
        `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
    }
  },

  renderClients(clientes) {
    const container = document.getElementById('clients-container');

    if (clientes.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <h3>No hay clientes registrados</h3>
            <p>Agrega tu primer cliente para facturar</p>
            <button class="btn btn-primary btn-sm" onclick="Clients.showForm()">Agregar Cliente</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="client-grid">
        ${clientes.map(c => `
          <div class="client-card">
            <h4>${c.razon_social}</h4>
            <div class="rnc">${c.rnc_cedula}</div>
            <div class="client-info">
              ${c.direccion ? `📍 ${c.direccion}<br>` : ''}
              ${c.telefono ? `📞 ${c.telefono}<br>` : ''}
              ${c.correo ? `✉️ ${c.correo}` : ''}
            </div>
            <div class="client-actions">
              <button class="btn btn-secondary btn-sm" onclick="Clients.editForm(${c.id}, '${c.rnc_cedula}', '${(c.razon_social||'').replace(/'/g,"\\'")}', '${(c.direccion||'').replace(/'/g,"\\'")}', '${c.telefono||''}', '${c.correo||''}')">Editar</button>
              <button class="btn btn-danger btn-sm" onclick="Clients.remove(${c.id})">Eliminar</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  searchTimeout: null,
  search(value) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.load(value), 300);
  },

  showForm() {
    App.openModal('Nuevo Cliente', `
      <form onsubmit="Clients.save(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">RNC / Cédula *</label>
            <input type="text" class="form-input" id="c-rnc" required placeholder="101010101">
          </div>
          <div class="form-group">
            <label class="form-label">Razón Social *</label>
            <input type="text" class="form-input" id="c-razon" required placeholder="Empresa SRL">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Nombre Comercial</label>
          <input type="text" class="form-input" id="c-comercial" placeholder="Nombre comercial (opcional)">
        </div>
        <div class="form-group">
          <label class="form-label">Dirección</label>
          <input type="text" class="form-input" id="c-dir" placeholder="Dirección">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Municipio</label>
            <input type="text" class="form-input" id="c-mun" placeholder="Municipio">
          </div>
          <div class="form-group">
            <label class="form-label">Provincia</label>
            <input type="text" class="form-input" id="c-prov" placeholder="Provincia">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-input" id="c-tel" placeholder="809-000-0000">
          </div>
          <div class="form-group">
            <label class="form-label">Correo</label>
            <input type="email" class="form-input" id="c-email" placeholder="correo@empresa.com">
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar Cliente</button>
        </div>
      </form>
    `);
  },

  editForm(id, rnc, razon, dir, tel, email) {
    App.openModal('Editar Cliente', `
      <form onsubmit="Clients.update(event, ${id})">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">RNC / Cédula</label>
            <input type="text" class="form-input" value="${rnc}" disabled style="opacity:0.6">
          </div>
          <div class="form-group">
            <label class="form-label">Razón Social *</label>
            <input type="text" class="form-input" id="ce-razon" required value="${razon}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Dirección</label>
          <input type="text" class="form-input" id="ce-dir" value="${dir}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-input" id="ce-tel" value="${tel}">
          </div>
          <div class="form-group">
            <label class="form-label">Correo</label>
            <input type="email" class="form-input" id="ce-email" value="${email}">
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Actualizar</button>
        </div>
      </form>
    `);
  },

  async save(event) {
    event.preventDefault();
    try {
      await App.api('POST', '/clientes', {
        rnc_cedula: document.getElementById('c-rnc').value,
        razon_social: document.getElementById('c-razon').value,
        nombre_comercial: document.getElementById('c-comercial').value,
        direccion: document.getElementById('c-dir').value,
        municipio: document.getElementById('c-mun').value,
        provincia: document.getElementById('c-prov').value,
        telefono: document.getElementById('c-tel').value,
        correo: document.getElementById('c-email').value
      });
      App.toast('Cliente creado exitosamente');
      App.closeModal();
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async update(event, id) {
    event.preventDefault();
    try {
      await App.api('PUT', `/clientes/${id}`, {
        razon_social: document.getElementById('ce-razon').value,
        direccion: document.getElementById('ce-dir').value,
        telefono: document.getElementById('ce-tel').value,
        correo: document.getElementById('ce-email').value
      });
      App.toast('Cliente actualizado');
      App.closeModal();
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  },

  async remove(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await App.api('DELETE', `/clientes/${id}`);
      App.toast('Cliente eliminado');
      this.load();
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
