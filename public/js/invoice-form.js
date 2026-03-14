/* ═══════════════════════════════════════════
   Invoice Creation Form
   ═══════════════════════════════════════════ */

const InvoiceForm = {
  items: [],
  clientes: [],

  async render(container) {
    // Load clients
    try {
      const data = await App.api('GET', '/clientes');
      this.clientes = data.clientes || [];
    } catch (e) {
      this.clientes = [];
    }

    this.items = [{ descripcion: '', cantidad: 1, unidad_medida: 'UND', precio_unitario: 0, tasa_itbis: 18, descuento_porcentaje: 0 }];

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div>
            <h2>Nueva Factura</h2>
            <p>Crear un nuevo comprobante fiscal electrónico</p>
          </div>
        </div>

        <form id="invoice-form" onsubmit="InvoiceForm.submit(event)">
          <div class="card" style="margin-bottom:24px">
            <h3 class="section-title">Datos del Comprobante</h3>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label class="form-label">Tipo de e-CF</label>
                <select class="form-select" id="tipo_ecf" required>
                  <option value="31">31 — Crédito Fiscal</option>
                  <option value="32">32 — Consumo</option>
                  <option value="33">33 — Nota de Débito</option>
                  <option value="34">34 — Nota de Crédito</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Forma de Pago</label>
                <select class="form-select" id="tipo_pago">
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
              <div class="form-group">
                <label class="form-label">Fecha Vencimiento</label>
                <input type="date" class="form-input" id="fecha_vencimiento" value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
              </div>
            </div>
            <div class="form-row" id="ref-row" style="display:none">
              <div class="form-group">
                <label class="form-label">e-NCF de Referencia (para NC/ND)</label>
                <input type="text" class="form-input" id="referencia_encf" placeholder="Ej: E310000000001">
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:24px">
            <h3 class="section-title">Comprador</h3>
            <div class="form-row">
              <div class="form-group" style="flex:2">
                <label class="form-label">Cliente</label>
                <select class="form-select" id="cliente_id" onchange="InvoiceForm.onClientChange()">
                  <option value="">— Sin cliente (Consumo general) —</option>
                  ${this.clientes.map(c => `<option value="${c.id}">${c.rnc_cedula} — ${c.razon_social}</option>`).join('')}
                </select>
              </div>
              <div class="form-group" style="flex:0 0 auto">
                <label class="form-label">&nbsp;</label>
                <button type="button" class="btn btn-secondary" onclick="InvoiceForm.quickAddClient()">+ Nuevo Cliente</button>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:24px">
            <div class="items-header">
              <h3 class="section-title" style="margin-bottom:0;border:none;padding:0">Ítems de Factura</h3>
              <button type="button" class="btn btn-secondary btn-sm" onclick="InvoiceForm.addItem()">+ Agregar Ítem</button>
            </div>

            <div style="overflow-x:auto">
              <div style="min-width:700px">
                <div class="item-row" style="border-bottom:2px solid var(--border-color);padding-bottom:4px">
                  <span class="form-label" style="margin:0">Descripción</span>
                  <span class="form-label" style="margin:0">Cantidad</span>
                  <span class="form-label" style="margin:0">Unidad</span>
                  <span class="form-label" style="margin:0">Precio Unit.</span>
                  <span class="form-label" style="margin:0">ITBIS %</span>
                  <span class="form-label" style="margin:0">Subtotal</span>
                  <span></span>
                </div>
                <div id="items-container"></div>
              </div>
            </div>

            <div class="invoice-totals">
              <div class="totals-box">
                <div class="total-row"><span>Subtotal</span><span id="t-subtotal">RD$ 0.00</span></div>
                <div class="total-row"><span>Descuentos</span><span id="t-descuento">RD$ 0.00</span></div>
                <div class="total-row"><span>ITBIS (18%)</span><span id="t-itbis18">RD$ 0.00</span></div>
                <div class="total-row"><span>ITBIS (16%)</span><span id="t-itbis16">RD$ 0.00</span></div>
                <div class="total-row grand-total"><span>Total</span><span id="t-total">RD$ 0.00</span></div>
              </div>
            </div>
          </div>

          <div class="card" style="margin-bottom:24px">
            <div class="form-group">
              <label class="form-label">Notas / Observaciones</label>
              <textarea class="form-textarea" id="notas" placeholder="Notas opcionales..."></textarea>
            </div>
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end">
            <a href="#/facturas" class="btn btn-secondary">Cancelar</a>
            <button type="submit" class="btn btn-primary" id="submit-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              Crear Factura
            </button>
          </div>
        </form>
      </div>
    `;

    this.renderItems();
    this.setupTypeListener();
  },

  setupTypeListener() {
    const tipoSelect = document.getElementById('tipo_ecf');
    tipoSelect.addEventListener('change', () => {
      const tipo = Number(tipoSelect.value);
      document.getElementById('ref-row').style.display = (tipo === 33 || tipo === 34) ? '' : 'none';
    });
  },

  renderItems() {
    const container = document.getElementById('items-container');
    if (!container) return;

    container.innerHTML = this.items.map((item, i) => {
      const subtotal = (item.cantidad || 0) * (item.precio_unitario || 0);
      return `
        <div class="item-row">
          <input type="text" class="form-input" placeholder="Descripción del item" value="${item.descripcion}"
                 onchange="InvoiceForm.updateItem(${i},'descripcion',this.value)" required>
          <input type="number" class="form-input" min="0.01" step="0.01" value="${item.cantidad}"
                 onchange="InvoiceForm.updateItem(${i},'cantidad',this.value)">
          <select class="form-select" onchange="InvoiceForm.updateItem(${i},'unidad_medida',this.value)">
            <option ${item.unidad_medida==='UND'?'selected':''}>UND</option>
            <option ${item.unidad_medida==='HRS'?'selected':''}>HRS</option>
            <option ${item.unidad_medida==='KG'?'selected':''}>KG</option>
            <option ${item.unidad_medida==='LT'?'selected':''}>LT</option>
            <option ${item.unidad_medida==='MT'?'selected':''}>MT</option>
            <option ${item.unidad_medida==='SERV'?'selected':''}>SERV</option>
          </select>
          <input type="number" class="form-input" min="0" step="0.01" value="${item.precio_unitario}"
                 onchange="InvoiceForm.updateItem(${i},'precio_unitario',this.value)" placeholder="0.00">
          <select class="form-select" onchange="InvoiceForm.updateItem(${i},'tasa_itbis',this.value)">
            <option value="18" ${item.tasa_itbis==18?'selected':''}>18%</option>
            <option value="16" ${item.tasa_itbis==16?'selected':''}>16%</option>
            <option value="0" ${item.tasa_itbis==0?'selected':''}>0%</option>
          </select>
          <span class="form-input" style="text-align:right;background:var(--bg-tertiary);font-weight:600">
            ${App.formatMoney(subtotal)}
          </span>
          <button type="button" class="remove-item-btn" onclick="InvoiceForm.removeItem(${i})" ${this.items.length===1?'disabled':''}>
            ✕
          </button>
        </div>
      `;
    }).join('');

    this.updateTotals();
  },

  addItem() {
    this.items.push({ descripcion: '', cantidad: 1, unidad_medida: 'UND', precio_unitario: 0, tasa_itbis: 18, descuento_porcentaje: 0 });
    this.renderItems();
  },

  removeItem(index) {
    if (this.items.length <= 1) return;
    this.items.splice(index, 1);
    this.renderItems();
  },

  updateItem(index, field, value) {
    if (['cantidad', 'precio_unitario', 'tasa_itbis', 'descuento_porcentaje'].includes(field)) {
      this.items[index][field] = Number(value);
    } else {
      this.items[index][field] = value;
    }
    this.renderItems();
  },

  updateTotals() {
    let subtotal = 0, descuento = 0, itbis18 = 0, itbis16 = 0;

    for (const item of this.items) {
      const base = (item.cantidad || 0) * (item.precio_unitario || 0);
      const desc = base * ((item.descuento_porcentaje || 0) / 100);
      const gravable = base - desc;
      subtotal += base;
      descuento += desc;
      if (item.tasa_itbis === 18) itbis18 += gravable * 0.18;
      else if (item.tasa_itbis === 16) itbis16 += gravable * 0.16;
    }

    const total = subtotal - descuento + itbis18 + itbis16;

    const f = (v) => App.formatMoney(v);
    const el = (id) => document.getElementById(id);
    if (el('t-subtotal')) el('t-subtotal').textContent = f(subtotal);
    if (el('t-descuento')) el('t-descuento').textContent = f(descuento);
    if (el('t-itbis18')) el('t-itbis18').textContent = f(itbis18);
    if (el('t-itbis16')) el('t-itbis16').textContent = f(itbis16);
    if (el('t-total')) el('t-total').textContent = f(total);
  },

  async submit(event) {
    event.preventDefault();

    const validItems = this.items.filter(i => i.descripcion && i.precio_unitario > 0);
    if (validItems.length === 0) {
      App.toast('Agrega al menos un ítem con descripción y precio', 'error');
      return;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Creando...';

    try {
      const data = {
        tipo_ecf: Number(document.getElementById('tipo_ecf').value),
        cliente_id: document.getElementById('cliente_id').value || null,
        tipo_pago: Number(document.getElementById('tipo_pago').value),
        fecha_vencimiento: document.getElementById('fecha_vencimiento').value,
        referencia_encf: document.getElementById('referencia_encf')?.value || '',
        notas: document.getElementById('notas').value,
        items: validItems
      };

      const result = await App.api('POST', '/facturas', data);
      App.toast(`Factura ${result.encf} creada exitosamente`);
      window.location.hash = '#/facturas';
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Crear Factura';
    }
  },

  onClientChange() { /* placeholder for future auto-fill */ },

  quickAddClient() {
    App.openModal('Nuevo Cliente', `
      <form id="quick-client-form" onsubmit="InvoiceForm.saveQuickClient(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">RNC / Cédula</label>
            <input type="text" class="form-input" id="qc-rnc" required placeholder="101010101">
          </div>
          <div class="form-group">
            <label class="form-label">Razón Social</label>
            <input type="text" class="form-input" id="qc-razon" required placeholder="Empresa SRL">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-input" id="qc-tel" placeholder="809-000-0000">
          </div>
          <div class="form-group">
            <label class="form-label">Correo</label>
            <input type="email" class="form-input" id="qc-email" placeholder="correo@empresa.com">
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end">
          <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    `);
  },

  async saveQuickClient(event) {
    event.preventDefault();
    try {
      const data = {
        rnc_cedula: document.getElementById('qc-rnc').value,
        razon_social: document.getElementById('qc-razon').value,
        telefono: document.getElementById('qc-tel').value,
        correo: document.getElementById('qc-email').value
      };
      const result = await App.api('POST', '/clientes', data);
      App.toast('Cliente creado');
      App.closeModal();

      // Reload clients in dropdown
      const res = await App.api('GET', '/clientes');
      this.clientes = res.clientes || [];
      const select = document.getElementById('cliente_id');
      select.innerHTML = `<option value="">— Sin cliente —</option>` +
        this.clientes.map(c => `<option value="${c.id}" ${c.id===result.id?'selected':''}>${c.rnc_cedula} — ${c.razon_social}</option>`).join('');
    } catch (err) {
      App.toast(err.message, 'error');
    }
  }
};
