export function formatMoney(amount) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ecfTypeName(tipo) {
  const names = { 31: 'Crédito Fiscal', 32: 'Consumo', 33: 'Nota de Débito', 34: 'Nota de Crédito' };
  return names[tipo] || `Tipo ${tipo}`;
}

export function statusClass(estado) {
  const map = {
    borrador: 'badge-gray', creada: 'badge-blue', enviada: 'badge-amber',
    aceptada: 'badge-green', rechazada: 'badge-red',
  };
  return map[estado] || 'badge-gray';
}

export function statusText(estado) {
  const map = {
    borrador: 'Borrador', creada: 'Creada', enviada: 'Enviada',
    aceptada: 'Aceptada', rechazada: 'Rechazada',
  };
  return map[estado] || estado;
}

export function dgiiStatusClass(estado) {
  const map = {
    pendiente: 'badge-gray', enviado: 'badge-amber', Aceptado: 'badge-green',
    'Aceptado Condicional': 'badge-amber', Rechazado: 'badge-red', error: 'badge-red',
  };
  return map[estado] || 'badge-gray';
}

export function dgiiStatusText(estado) {
  const map = {
    pendiente: 'Pendiente', enviado: 'Enviado', Aceptado: 'Aceptado',
    'Aceptado Condicional': 'Aceptado Cond.', Rechazado: 'Rechazado', error: 'Error',
  };
  return map[estado] || estado || 'Pendiente';
}
