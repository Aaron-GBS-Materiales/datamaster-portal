import { useState } from 'react';
import { createSolicitud } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { UNIDADES } from '../constants/materiales';

const CATEGORIAS = [
  'BIENES INDIRECTOS','CAPEX','ENERGIA Y COMBUST.','ENVASE P/CEMENTO',
  'MATERIAS PRIMAS','MRO ELECTRICO/NICO','MRO MECANICO','REFRACTARIO AFINES','SUMIN/CONSUMIBLE',
];

const CENTROS_DESTINO = [
  { codigo:'U001', nombre:'U001 — ATOCONGO' },
  { codigo:'U002', nombre:'U002 — CONDORCOCHA' },
  { codigo:'U004', nombre:'U004 — MUELLE CONCHAN' },
  { codigo:'U001 Y U002', nombre:'U001 Y U002 — ATOCONGO Y CONDORCOCHA' },
];

export default function NuevaSolicitud({ onSuccess }) {
  const { user } = useAuth();
  const isUnacemPeru = user?.unidad_negocio === 'UNACEM PERU';

  const [centroDestino, setCentroDestino] = useState('');
  const [posiciones, setPosiciones] = useState([
    { id:1, denominacion:'', unidad_medida:'', texto_pedido:'', categoria:'' }
  ]);
  const [nextId, setNextId]       = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleAddPosicion = () => {
    setPosiciones([...posiciones, {
      id:nextId, denominacion:'', unidad_medida:'', texto_pedido:'', categoria:''
    }]);
    setNextId(nextId + 1);
  };

  const handleRemovePosicion = (id) => {
    if (posiciones.length > 1) setPosiciones(posiciones.filter(p => p.id !== id));
  };

  const handleChangePosicion = (id, field, value) => {
    setPosiciones(posiciones.map(p => p.id === id ? {...p, [field]: value} : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isUnacemPeru && !centroDestino) {
      setError('Selecciona el centro de destino del material'); return;
    }
    if (posiciones.some(p => !p.denominacion || !p.unidad_medida)) {
      setError('Completa denominación y unidad de medida en cada posición'); return;
    }
    if (posiciones.some(p => !p.categoria)) {
      setError('Selecciona una categoría en cada posición'); return;
    }

    setSubmitting(true);
    try {
      const ticketId = await createSolicitud({
        nombre_solicitante: user?.nombre,
        email_solicitante:  user?.email,
        unidad_negocio:     user?.unidad_negocio,
        pais:               user?.pais || 'Perú',
        centro:             centroDestino || null,
        posiciones,
      });
      onSuccess(ticketId);
      setPosiciones([{ id:1, denominacion:'', unidad_medida:'', texto_pedido:'', categoria:'' }]);
      setNextId(2);
      setCentroDestino('');
    } catch (err) {
      setError(err.message || 'Error al crear solicitud');
    }
    setSubmitting(false);
  };

  return (
    <div style={{padding:28}}>
      <h2 style={{fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0}}>Nueva solicitud</h2>
      <p style={{fontSize:12, color:'#6b7280', marginTop:3, marginBottom:24}}>Creación de código SAP</p>

      <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:24}}>
        <div style={{background:'#eff4ff', border:'1px solid #bfdbfe', borderRadius:8, padding:12,
          fontSize:13, color:'#2563eb', marginBottom:24}}>
          ℹ️ Puedes agregar múltiples materiales en una solicitud. Cada posición puede tener su propia categoría.
        </div>

        <form onSubmit={handleSubmit}>

          {/* Centro de destino — solo UNACEM PERU */}
          {isUnacemPeru && (
            <div style={{marginBottom:24, padding:16, background:'#f0fdf4',
              border:'1px solid #bbf7d0', borderRadius:10}}>
              <label style={{display:'block', fontSize:13, fontWeight:700,
                color:'#0f1d3a', marginBottom:8}}>
                🏭 Centro de destino del material <span style={{color:'#dc2626'}}>*</span>
              </label>
              <select
                style={{width:'100%', padding:'10px 12px', border:'1.5px solid #bbf7d0',
                  borderRadius:8, fontSize:13, outline:'none',
                  background: centroDestino ? '#f0fdf4' : '#fff',
                  color: centroDestino ? '#16a34a' : '#374151',
                  fontWeight: centroDestino ? 600 : 400}}
                value={centroDestino}
                onChange={e => setCentroDestino(e.target.value)}>
                <option value="">Seleccionar centro de destino…</option>
                {CENTROS_DESTINO.map(c => (
                  <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Posiciones */}
          {posiciones.map((pos, idx) => (
            <div key={pos.id}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <span style={{background:'#0f1d3a', color:'#fff', borderRadius:'50%',
                    width:24, height:24, display:'inline-flex', alignItems:'center',
                    justifyContent:'center', fontSize:11, fontWeight:700}}>
                    {idx + 1}
                  </span>
                  <h3 style={{fontSize:14, fontWeight:700, color:'#0f1d3a', margin:0}}>
                    Posición {idx + 1}
                  </h3>
                </div>
                {posiciones.length > 1 && (
                  <button type="button"
                    style={{padding:'5px 12px', background:'#fef2f2', color:'#dc2626',
                      border:'1px solid #fecaca', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer'}}
                    onClick={() => handleRemovePosicion(pos.id)}>
                    Eliminar
                  </button>
                )}
              </div>

              <div style={{background:'#f9fafb', border:'1px solid #e2e5ef',
                borderRadius:10, padding:16, marginBottom:20}}>

                {/* Categoría */}
                <div style={{marginBottom:14}}>
                  <label style={{display:'block', fontSize:12, fontWeight:700,
                    color:'#0f1d3a', marginBottom:6}}>
                    Categoría de Material <span style={{color:'#dc2626'}}>*</span>
                  </label>
                  <select
                    style={{width:'100%', padding:'9px 12px',
                      border: pos.categoria ? '1.5px solid #2563eb' : '1px solid #d1d5db',
                      borderRadius:8, fontSize:13, boxSizing:'border-box', outline:'none',
                      background: pos.categoria ? '#eff4ff' : '#fff',
                      color: pos.categoria ? '#2563eb' : '#374151',
                      fontWeight: pos.categoria ? 600 : 400}}
                    value={pos.categoria}
                    onChange={e => handleChangePosicion(pos.id, 'categoria', e.target.value)}>
                    <option value="">Seleccionar categoría…</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Denominación */}
                <div style={{marginBottom:14}}>
                  <label style={{display:'block', fontSize:12, fontWeight:700,
                    color:'#0f1d3a', marginBottom:6}}>
                    Denominación <span style={{color:'#dc2626'}}>*</span>
                  </label>
                  <input type="text"
                    style={{width:'100%', padding:'9px 12px', border:'1px solid #d1d5db',
                      borderRadius:8, fontSize:13, boxSizing:'border-box', outline:'none'}}
                    placeholder="TUBO ACERO"
                    value={pos.denominacion}
                    onChange={e => handleChangePosicion(pos.id, 'denominacion', e.target.value)}
                  />
                </div>

                {/* Unidad de medida */}
                <div style={{marginBottom:14}}>
                  <label style={{display:'block', fontSize:12, fontWeight:700,
                    color:'#0f1d3a', marginBottom:6}}>
                    Unidad de medida <span style={{color:'#dc2626'}}>*</span>
                  </label>
                  <select
                    style={{width:'100%', padding:'9px 12px', border:'1px solid #d1d5db',
                      borderRadius:8, fontSize:13, boxSizing:'border-box', outline:'none'}}
                    value={pos.unidad_medida}
                    onChange={e => handleChangePosicion(pos.id, 'unidad_medida', e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Texto de pedido */}
                <div>
                  <label style={{display:'block', fontSize:12, fontWeight:700,
                    color:'#0f1d3a', marginBottom:6}}>
                    Texto de pedido
                  </label>
                  <textarea
                    style={{width:'100%', padding:'9px 12px', border:'1px solid #d1d5db',
                      borderRadius:8, fontSize:13, minHeight:70, boxSizing:'border-box',
                      resize:'vertical', outline:'none'}}
                    placeholder="Especificaciones técnicas del material..."
                    value={pos.texto_pedido}
                    onChange={e => handleChangePosicion(pos.id, 'texto_pedido', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {error && (
            <div style={{background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
              padding:12, color:'#dc2626', fontSize:13, marginBottom:16}}>
              {error}
            </div>
          )}

          <div style={{display:'flex', gap:12, marginTop:8}}>
            <button type="button"
              style={{padding:'10px 16px', background:'#f0f2f8', color:'#2563eb',
                border:'1px solid #d1d5db', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer'}}
              onClick={handleAddPosicion}>
              + Agregar posición
            </button>
            <button type="submit"
              style={{padding:'10px 24px', background:'#2563eb', color:'#fff',
                border:'none', borderRadius:8, fontSize:13, fontWeight:700,
                cursor:'pointer', opacity: submitting ? 0.7 : 1}}
              disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
