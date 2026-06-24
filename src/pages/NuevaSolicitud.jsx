// pages/NuevaSolicitud.jsx
import { useState } from 'react';
import { createSolicitud } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { UNIDADES } from '../constants/materiales';

export default function NuevaSolicitud({ onSuccess }) {
  const { user } = useAuth();
  const [posiciones, setPosiciones] = useState([
    { id: 1, denominacion: '', unidad_medida: '', texto_pedido: '' }
  ]);
  const [nextId, setNextId] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddPosicion = () => {
    setPosiciones([...posiciones, { id: nextId, denominacion: '', unidad_medida: '', texto_pedido: '' }]);
    setNextId(nextId + 1);
  };

  const handleRemovePosicion = (id) => {
    if (posiciones.length > 1) {
      setPosiciones(posiciones.filter(p => p.id !== id));
    }
  };

  const handleChangePosicion = (id, field, value) => {
    setPosiciones(posiciones.map(p => p.id === id ? {...p, [field]: value} : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (posiciones.some(p => !p.denominacion || !p.unidad_medida)) {
      setError('Completa todos los campos requeridos en cada posición');
      return;
    }

    setSubmitting(true);
    try {
      const ticketId = await createSolicitud({
        nombre_solicitante: user?.nombre,
        email_solicitante: user?.email,
        unidad_negocio: user?.unidad_negocio,
        pais: user?.pais || 'Perú',
        posiciones: posiciones,
      });
      
      onSuccess(ticketId);
      setPosiciones([{ id: 1, denominacion: '', unidad_medida: '', texto_pedido: '' }]);
      setNextId(2);
    } catch (err) {
      setError(err.message || 'Error al crear solicitud');
    }
    setSubmitting(false);
  };

  return (
    <div style={s.wrap}>
      <h2 style={s.h2}>Nueva solicitud</h2>
      <p style={s.sub}>Creación de código SAP</p>

      <div style={s.card}>
        <div style={s.infoBox}>
          ℹ️ Puedes agregar múltiples materiales en una sola solicitud.
        </div>

        <form onSubmit={handleSubmit}>
          {posiciones.map((pos, idx) => (
            <div key={pos.id} style={s.posicionCard}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <h3 style={s.posicionTitle}>Posición {idx + 1}</h3>
                {posiciones.length > 1 && (
                  <button
                    type="button"
                    style={s.btnRemove}
                    onClick={() => handleRemovePosicion(pos.id)}>
                    ✕ Eliminar
                  </button>
                )}
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Denominación del material *</label>
                <input
                  type="text"
                  style={s.input}
                  placeholder="Ej: TUBO ACERO AL CARBONO SIN COSTURA 2\" SCH40"
                  value={pos.denominacion}
                  onChange={(e) => handleChangePosicion(pos.id, 'denominacion', e.target.value)}
                />
                <div style={s.hint}>Escribe el nombre lo más descriptivo posible.</div>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Unidad de medida *</label>
                <select
                  style={s.input}
                  value={pos.unidad_medida}
                  onChange={(e) => handleChangePosicion(pos.id, 'unidad_medida', e.target.value)}>
                  <option value="">Seleccionar unidad...</option>
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Texto de pedido de compra *</label>
                <textarea
                  style={{...s.input, minHeight: 80}}
                  placeholder="Especificaciones técnicas, uso del material, proveedor referencial u otra información relevante..."
                  value={pos.texto_pedido}
                  onChange={(e) => handleChangePosicion(pos.id, 'texto_pedido', e.target.value)}
                />
              </div>

              {idx < posiciones.length - 1 && <div style={s.divider} />}
            </div>
          ))}

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.actions}>
            <button
              type="button"
              style={s.btnAdd}
              onClick={handleAddPosicion}>
              ➕ Agregar posición
            </button>
            <button
              type="submit"
              style={s.btnSubmit}
              disabled={submitting}>
              {submitting ? 'Enviando...' : '✓ Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap:          { padding: 28 },
  h2:            { fontSize: 18, fontWeight: 800, color: '#0f1d3a', margin: 0 },
  sub:           { fontSize: 12, color: '#6b7280', marginTop: 3, marginBottom: 24 },
  card:          { background: '#fff', border: '1px solid #e2e5ef', borderRadius: 12, padding: 24 },
  infoBox:       { background: '#eff4ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, fontSize: 13, color: '#2563eb', marginBottom: 24 },
  posicionCard:  { paddingBottom: 24 },
  posicionTitle: { fontSize: 14, fontWeight: 700, color: '#0f1d3a', margin: 0 },
  formGroup:     { marginBottom: 18 },
  label:         { display: 'block', fontSize: 13, fontWeight: 600, color: '#0f1d3a', marginBottom: 8 },
  input:         { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' },
  hint:          { fontSize: 12, color: '#9ca3af', marginTop: 5 },
  divider:       { height: '1px', background: '#e2e5ef', margin: '24px 0' },
  actions:       { display: 'flex', gap: 12, marginTop: 28 },
  btnAdd:        { padding: '10px 16px', background: '#f0f2f8', color: '#2563eb', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnRemove:     { padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnSubmit:     { padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  errorBox:      { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 13, marginBottom: 16 },
};
