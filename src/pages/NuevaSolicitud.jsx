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
      setError('Completa todos los campos requeridos en cada posicion');
      return;
    }

    setSubmitting(true);
    try {
      const ticketId = await createSolicitud({
        nombre_solicitante: user?.nombre,
        email_solicitante: user?.email,
        unidad_negocio: user?.unidad_negocio,
        pais: user?.pais || 'Peru',
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
    <div style={{padding: 28}}>
      <h2 style={{fontSize: 18, fontWeight: 800, color: '#0f1d3a', margin: 0}}>Nueva solicitud</h2>
      <p style={{fontSize: 12, color: '#6b7280', marginTop: 3, marginBottom: 24}}>Creacion de codigo SAP</p>

      <div style={{background: '#fff', border: '1px solid #e2e5ef', borderRadius: 12, padding: 24}}>
        <div style={{background: '#eff4ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12, fontSize: 13, color: '#2563eb', marginBottom: 24}}>
          Info: Puedes agregar multiples materiales en una solicitud.
        </div>

        <form onSubmit={handleSubmit}>
          {posiciones.map((pos, idx) => (
            <div key={pos.id} style={{paddingBottom: 24}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <h3 style={{fontSize: 14, fontWeight: 700, color: '#0f1d3a', margin: 0}}>Posicion {idx + 1}</h3>
                {posiciones.length > 1 && (
                  <button type="button" style={{padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer'}} onClick={() => handleRemovePosicion(pos.id)}>
                    Eliminar
                  </button>
                )}
              </div>

              <div style={{marginBottom: 18}}>
                <label style={{display:'block', fontSize: 13, fontWeight: 600, color: '#0f1d3a', marginBottom: 8}}>Denominacion *</label>
                <input type="text" style={{width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box'}} placeholder="TUBO ACERO" value={pos.denominacion} onChange={(e) => handleChangePosicion(pos.id, 'denominacion', e.target.value)} />
              </div>

              <div style={{marginBottom: 18}}>
                <label style={{display:'block', fontSize: 13, fontWeight: 600, color: '#0f1d3a', marginBottom: 8}}>Unidad de medida *</label>
                <select style={{width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box'}} value={pos.unidad_medida} onChange={(e) => handleChangePosicion(pos.id, 'unidad_medida', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div style={{marginBottom: 18}}>
                <label style={{display:'block', fontSize: 13, fontWeight: 600, color: '#0f1d3a', marginBottom: 8}}>Texto de pedido *</label>
                <textarea style={{width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, minHeight: 80, boxSizing: 'border-box'}} placeholder="Especificaciones..." value={pos.texto_pedido} onChange={(e) => handleChangePosicion(pos.id, 'texto_pedido', e.target.value)} />
              </div>

              {idx < posiciones.length - 1 && <div style={{height: '1px', background: '#e2e5ef', margin: '24px 0'}} />}
            </div>
          ))}

          {error && <div style={{background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 13, marginBottom: 16}}>{error}</div>}

          <div style={{display:'flex', gap: 12, marginTop: 28}}>
            <button type="button" style={{padding: '10px 16px', background: '#f0f2f8', color: '#2563eb', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'}} onClick={handleAddPosicion}>
              Agregar posicion
            </button>
            <button type="submit" style={{padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'}} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
