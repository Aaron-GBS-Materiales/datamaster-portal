import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, avanzarPaso, rechazarSolicitud, 
         getPosicionesBySolicitud, actualizarPosicion } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { TIPOS_MATERIAL, GRUPOS_ARTICULOS } from '../constants/materiales';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function GestorInventario() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formPosiciones, setFormPosiciones] = useState({});  // { [posId]: { tipoMaterial, grupoArticulos } }
  const [motivo, setMotivo] = useState('');
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const paso2 = await getSolicitudesPorPaso(2);
      const paso3 = await getSolicitudesPorPaso(3);
      const paso4 = await getSolicitudesPorPaso(4);
      const paso5 = await getSolicitudesPorPaso(5);
      const data = [...paso2, ...paso3, ...paso4, ...paso5].filter(s => s.unidad_negocio === 'UNACEM PERU');
      setSolicitudes(data);
    } catch {}
    setLoading(false);
  }

  async function handleRevisar(sol) {
    const pos = await getPosicionesBySolicitud(sol.id);
    setSelected({...sol, posiciones: pos});
    // Inicializar form con una entrada por posición (precargar si ya tiene valores)
    const initForm = {};
    pos.forEach(p => {
      initForm[p.id] = {
        tipoMaterial: p.tipo_material || '',
        grupoArticulos: p.grupo_articulos || '',
      };
    });
    setFormPosiciones(initForm);
    setMotivo('');
    setAction(null);
  }

  function handleChangePosicion(posId, field, value) {
    setFormPosiciones(prev => ({
      ...prev,
      [posId]: {
        ...prev[posId],
        [field]: value,
        // Si cambia el tipo, limpiar el grupo
        ...(field === 'tipoMaterial' ? { grupoArticulos: '' } : {}),
      }
    }));
  }

  const todasPosicionesCompletas = () => {
    if (!selected?.posiciones?.length) return false;
    return selected.posiciones.every(p =>
      formPosiciones[p.id]?.tipoMaterial && formPosiciones[p.id]?.grupoArticulos
    );
  };

  async function handleCompletar() {
    if (!todasPosicionesCompletas()) return;
    setSaving(true);
    try {
      // Guardar tipo_material y grupo_articulos en cada posición individualmente
      await Promise.all(
        selected.posiciones.map(p =>
          actualizarPosicion(p.id, {
            tipo_material: formPosiciones[p.id].tipoMaterial,
            grupo_articulos: formPosiciones[p.id].grupoArticulos,
          })
        )
      );
      // Avanzar solicitud al paso 3
      await avanzarPaso(selected.id, 3, { asignado_a: user.email });
      setSelected(null);
      setFormPosiciones({});
      setAction(null);
      load();
    } catch {}
    setSaving(false);
  }

  async function handleRechazar() {
    if (!motivo) return;
    setSaving(true);
    try {
      await rechazarSolicitud(selected.id, motivo);
      setSelected(null);
      setMotivo('');
      setAction(null);
      load();
    } catch {}
    setSaving(false);
  }

  const procesadas = solicitudes.filter(s => s.paso > 2);

  return (
    <div style={s.wrap}>
      {/* PENDIENTES */}
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Pendientes de revisar</h2>
            <p style={s.sub}>Paso 2: Completa información del material</p>
          </div>
          <span style={{fontSize:13, color:'#9ca3af'}}>{solicitudes.filter(s => s.paso === 2).length} pendientes</span>
        </div>

        {loading ? (
          <div style={s.loading}>Cargando…</div>
        ) : solicitudes.filter(s => s.paso === 2).length === 0 ? (
          <div style={s.empty}>No hay solicitudes pendientes</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','País','Estado','Acción'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {solicitudes.filter(s => s.paso === 2).map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:12, background:'#eff4ff', color:'#2563eb'}}>
                        Paso 2
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={s.btnRevisar} onClick={() => handleRevisar(sol)}>
                        Revisar →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROCESADAS */}
      {procesadas.length > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <h3 style={{...s.h2, fontSize:16}}>Historial de revisiones ({procesadas.length})</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','Posiciones','Estado','Fecha'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {procesadas.map(sol => (
                  <tr key={sol.id} style={{opacity:.7}}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, color:'#6b7280'}}>
                        {sol.posiciones_count || '—'} posición(es)
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:12, background:sol.estado==='Rechazada'?'#fef2f2':'#dcfce7', color:sol.estado==='Rechazada'?'#dc2626':'#16a34a'}}>
                        {sol.estado}
                      </span>
                    </td>
                    <td style={{...s.td, fontSize:11, color:'#6b7280'}}>
                      {sol.fecha_recepcion ? new Date(sol.fecha_recepcion).toLocaleDateString('es-PE') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {selected && (
        <div style={s.modalBg} onClick={()=>setSelected(null)}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <h3 style={s.mTitle}>Revisar y Completar</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            {/* POSICIONES CON SELECTS INDIVIDUALES */}
            <div style={s.posicionesBox}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f1d3a', marginBottom:12}}>
                Posiciones solicitadas ({selected.posiciones?.length || 0})
              </div>

              {selected.posiciones && selected.posiciones.map((pos, idx) => {
                const posForm = formPosiciones[pos.id] || { tipoMaterial: '', grupoArticulos: '' };
                const gruposDisponibles = posForm.tipoMaterial
                  ? (GRUPOS_ARTICULOS[posForm.tipoMaterial] || [])
                  : [];
                const completa = posForm.tipoMaterial && posForm.grupoArticulos;

                return (
                  <div key={pos.id} style={{
                    ...s.posicionItem,
                    borderLeft: completa ? '3px solid #16a34a' : '3px solid #e2e5ef',
                  }}>
                    {/* Encabezado posición */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                      <span style={{fontSize:11, fontWeight:700, color:'#6b7280', letterSpacing:'.5px'}}>
                        POSICIÓN {idx + 1}
                      </span>
                      {completa && (
                        <span style={{fontSize:10, fontWeight:700, color:'#16a34a', background:'#dcfce7', padding:'2px 8px', borderRadius:10}}>
                          ✓ Completa
                        </span>
                      )}
                    </div>

                    {/* Info del material */}
                    <div style={{marginBottom:8}}>
                      <div style={s.posLabel}>DENOMINACIÓN</div>
                      <div style={s.posValor}>{pos.denominacion}</div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8}}>
                      <div>
                        <div style={s.posLabel}>UNIDAD DE MEDIDA</div>
                        <div style={s.posValor}>{pos.unidad_medida}</div>
                      </div>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={s.posLabel}>TEXTO DE PEDIDO</div>
                      <div style={{...s.posValor, whiteSpace:'pre-wrap', maxHeight:50, overflow:'auto', color:'#6b7280'}}>
                        {pos.texto_pedido || '—'}
                      </div>
                    </div>

                    {/* Selects por posición — solo cuando NO está en modo rechazar */}
                    {action !== 'rechazar' && (
                      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, paddingTop:10, borderTop:'1px dashed #e2e5ef'}}>
                        <div>
                          <label style={s.label}>
                            Tipo de Material <span style={{color:'#dc2626'}}>*</span>
                          </label>
                          <select
                            style={s.select}
                            value={posForm.tipoMaterial}
                            onChange={e => handleChangePosicion(pos.id, 'tipoMaterial', e.target.value)}
                          >
                            <option value="">Seleccionar tipo…</option>
                            {TIPOS_MATERIAL.map(t =>
                              <option key={t.codigo} value={t.codigo}>{t.codigo} - {t.nombre}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label style={s.label}>
                            Grupo de Artículos <span style={{color:'#dc2626'}}>*</span>
                          </label>
                          <select
                            style={{...s.select, background: !posForm.tipoMaterial ? '#f9fafb' : '#fff'}}
                            value={posForm.grupoArticulos}
                            disabled={!posForm.tipoMaterial}
                            onChange={e => handleChangePosicion(pos.id, 'grupoArticulos', e.target.value)}
                          >
                            <option value="">Seleccionar grupo…</option>
                            {gruposDisponibles.map(g =>
                              <option key={g.codigo} value={g.codigo}>{g.codigo} - {g.nombre}</option>
                            )}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Campo motivo rechazo */}
            {action === 'rechazar' && (
              <div style={{marginBottom:20}}>
                <label style={{...s.label, marginBottom:7}}>Motivo del rechazo</label>
                <textarea
                  style={{...s.input, resize:'vertical', minHeight:80}}
                  placeholder="Indica por qué se rechaza esta solicitud"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                />
              </div>
            )}

            {/* Indicador de progreso */}
            {action !== 'rechazar' && selected.posiciones?.length > 1 && (
              <div style={{marginBottom:16, fontSize:12, color:'#6b7280', textAlign:'right'}}>
                {selected.posiciones.filter(p => formPosiciones[p.id]?.tipoMaterial && formPosiciones[p.id]?.grupoArticulos).length}
                /{selected.posiciones.length} posiciones completadas
              </div>
            )}

            {/* Botones */}
            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button style={s.btnCancel} onClick={() => setSelected(null)}>Cancelar</button>
              {action === null ? (
                <>
                  <button style={s.btnReject} onClick={() => setAction('rechazar')} disabled={saving}>
                    ✗ Rechazar
                  </button>
                  <button
                    style={{...s.btnComplete, opacity: todasPosicionesCompletas() ? 1 : 0.5}}
                    onClick={handleCompletar}
                    disabled={!todasPosicionesCompletas() || saving}
                  >
                    {saving ? 'Enviando…' : 'Enviar a Líder →'}
                  </button>
                </>
              ) : (
                <>
                  <button style={s.btnCancel} onClick={() => setAction(null)}>Atrás</button>
                  <button style={s.btnReject} onClick={handleRechazar} disabled={!motivo || saving}>
                    {saving ? 'Rechazando…' : 'Confirmar rechazo'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:         { padding:28 },
  card:         { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden', marginBottom:20 },
  header:       { padding:'20px 24px', borderBottom:'1px solid #e2e5ef', display:'flex', alignItems:'center', justifyContent:'space-between' },
  h2:           { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:          { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:      { padding:48, textAlign:'center', color:'#9ca3af' },
  empty:        { padding:48, textAlign:'center', color:'#9ca3af' },
  table:        { width:'100%', borderCollapse:'collapse' },
  th:           { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:           { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
  btnRevisar:   { padding:'5px 12px', background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:      { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:        { background:'#fff', borderRadius:16, padding:32, maxWidth:580, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)', maxHeight:'90vh', overflow:'auto' },
  mTitle:       { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:         { fontSize:13, color:'#6b7280', marginBottom:20 },
  posicionesBox:{ background:'#f5f6fa', borderRadius:10, padding:14, marginBottom:20 },
  posicionItem: { background:'#fff', borderRadius:8, padding:14, marginBottom:12, border:'1px solid #e2e5ef' },
  posLabel:     { fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:3, letterSpacing:'.5px' },
  posValor:     { fontSize:13, color:'#111827' },
  label:        { display:'block', fontSize:11, fontWeight:600, color:'#374151', marginBottom:5 },
  input:        { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' },
  select:       { width:'100%', padding:'8px 10px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff' },
  btnCancel:    { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnReject:    { padding:'10px 18px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnComplete:  { padding:'10px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
