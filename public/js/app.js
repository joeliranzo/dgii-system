/* ═══════════════════════════════════════════
   e-CF DGII System — Main App Controller
   ═══════════════════════════════════════════ */

const App = {
  currentPage: 'dashboard',

  async init() {
    this.setupRouter();
    this.setupModal();
    this.navigate(window.location.hash || '#/');
  },

  setupRouter() {
    window.addEventListener('hashchange', () => this.navigate(window.location.hash));
  },

  navigate(hash) {
    const routes = {
      '#/': 'dashboard',
      '#/dashboard': 'dashboard',
      '#/nueva-factura': 'nueva-factura',
      '#/facturas': 'facturas',
      '#/clientes': 'clientes',
      '#/configuracion': 'configuracion'
    };

    const page = routes[hash] || 'dashboard';
    this.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Render page
    this.renderPage(page);
  },

  renderPage(page) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    switch (page) {
      case 'dashboard': Dashboard.render(main); break;
      case 'nueva-factura': InvoiceForm.render(main); break;
      case 'facturas': InvoicesList.render(main); break;
      case 'clientes': Clients.render(main); break;
      case 'configuracion': Settings.render(main); break;
      default: Dashboard.render(main);
    }
  },

  // ── API Helpers ──
  async api(method, url, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) opts.body = JSON.stringify(data);

    const res = await fetch(`/api${url}`, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error en la petición');
    return json;
  },

  // ── Toast ──
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // ── Modal ──
  setupModal() {
    document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
  },

  openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  },

  // ── Format Helpers ──
  formatMoney(amount) {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  ecfTypeName(tipo) {
    const names = {
      31: 'Crédito Fiscal',
      32: 'Consumo',
      33: 'Nota de Débito',
      34: 'Nota de Crédito'
    };
    return names[tipo] || `Tipo ${tipo}`;
  },

  statusBadge(estado) {
    const map = {
      borrador: { class: 'badge-gray', text: 'Borrador' },
      creada: { class: 'badge-blue', text: 'Creada' },
      enviada: { class: 'badge-amber', text: 'Enviada' },
      aceptada: { class: 'badge-green', text: 'Aceptada' },
      rechazada: { class: 'badge-red', text: 'Rechazada' }
    };
    const s = map[estado] || { class: 'badge-gray', text: estado };
    return `<span class="badge ${s.class}">${s.text}</span>`;
  },

  dgiiStatusBadge(estado) {
    const map = {
      pendiente: { class: 'badge-gray', text: 'Pendiente' },
      enviado: { class: 'badge-amber', text: 'Enviado' },
      'Aceptado': { class: 'badge-green', text: 'Aceptado' },
      'Aceptado Condicional': { class: 'badge-amber', text: 'Aceptado Cond.' },
      'Rechazado': { class: 'badge-red', text: 'Rechazado' },
      error: { class: 'badge-red', text: 'Error' }
    };
    const s = map[estado] || { class: 'badge-gray', text: estado || 'Pendiente' };
    return `<span class="badge ${s.class}">${s.text}</span>`;
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
