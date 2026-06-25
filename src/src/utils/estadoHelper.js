// utils/estadoHelper.js

export function getEstadoLabel(paso, flujo = 'extendido') {
  if (flujo === 'directo') {
    // Solicitante NO UNACEM PERU
    if (paso <= 3) return { label: 'Creación Pendiente', color: '#7c3aed', bg: '#ede9fe' };
    if (paso === 4) return { label: 'Creación Pendiente', color: '#7c3aed', bg: '#ede9fe' };
    return             { label: 'Atendido',            color: '#16a34a', bg: '#dcfce7' };
  }

  // Flujo extendido (UNACEM PERU)
  switch (paso) {
    case 1:
    case 2:  return { label: 'Revisión Pendiente',   color: '#b45309', bg: '#fef9c3' };
    case 3:  return { label: 'Liberación Pendiente', color: '#1d4ed8', bg: '#dbeafe' };
    case 4:  return { label: 'Creación Pendiente',   color: '#7c3aed', bg: '#ede9fe' };
    default: return { label: 'Atendido',             color: '#16a34a', bg: '#dcfce7' };
  }
}

export function EstadoBadge({ paso, flujo }) {
  const { label, color, bg } = getEstadoLabel(paso, flujo);
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      padding: '3px 8px', borderRadius: 12,
      background: bg, color: color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
