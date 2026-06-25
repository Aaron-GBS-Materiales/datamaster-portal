// pages/LiderCategoria.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, avanzarPaso, rechazarSolicitud,
         getPosicionesBySolicitud, actualizarPosicion } from '../services/supabase';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function LiderCategoria() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formPosiciones, setFormPosiciones] = useState({});
  // { [posId]: { aprobada: bool|null, rechazada: bool, motivoRechazo: string, mostrarRechazo: bool } }
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const paso3 = await getSolicitudesPorPaso(3);
      const paso4 = await getSolicitudesPorPaso(4);
      const paso5 = await getSolicitudesPorPaso(5);
      setSolicitudes([...paso3, ...paso4, ...paso5]);
    } catch {}
    setLoading(false);
  }

  async function handleRevisar(sol) {
    const pos = await getPosicionesBySolicitud(sol.id);
    setSelected({...sol, posiciones: pos});
    const initForm = {};
    pos.forEach(p => {
      initForm[p.id] = {
        rechazada:      p.estado === 'Rechazada',
        motivoRechazo:  '',
        mostrarRechazo: false,
      };
    });
    setFormPosiciones(initForm);
  }

  function handleChangePos(posId, field, value) {
    setFormPosiciones(prev => ({
      ...prev,
      [posId]: { ...prev[posId], [field]: value }
    }));
  }

  // Posiciones no rechazadas (ya sea por Gestor o por Líder ahora)
  const posicionesAprobables = () =>
    selected?.posiciones?.filter(p => !formPosiciones[p.id]?.rechazada) || [];

  const hayAlgoAprobable = () => posicionesAprobables().length > 0;

  // Rechazar posición individual
  async function handleRechazarPosicion(posId) {
    const motivo = formPosiciones[posId]?.motivoRechazo;
    if (!motivo) return;
    setSaving(true);
    try {
      await actualizarPosicion(posId, {
        estado: 'Rechazada',
        motivo_rechazo: motivo,
      });
      setFormPosiciones(prev => ({
        ...prev,
        [posId]: { ...prev[posId], rechazada: true, mostrarRechazo: false }
      }));
      setSelected(prev => ({
        ...prev,
        posiciones: prev.posiciones.map(p =>
          p.id === posId ? {...p, estado: 'Rechazada'} : p
        )
      }));
    } catch {}
    setSaving(false);
  }

  // Aprobar posiciones aprobables + avanzar solicitud
  async function handleAprobarTodo() {
    if (!hayAlgoAprobable()) return;
    setSaving(true);
    try {
      await Promise.all(
        posicionesAprobables().map(p =>
          actualizarPosicion(p.id, { estado: 'Aprobada' })
        )
      );
      await avanzarPaso(selected.id, 4, {
        aprobado_por_lider: true,
        estado: 'Aprobada',
      });
      setSelected(null);
      setFormPosiciones({});
      load();
    } catch {}
    setSaving(false);
  }

  // Rechazar toda la solicitud
  async function handleRechazarTodo() {
    setSaving(true);
    try {
      await rechazarSolicitud(selected.id, 'Solicitud rechazada por Líder de Categoría');
      setSelected(null);
      setFormPosiciones({});
      load();
    } catch {}
    setSaving(false);
  }

  const pendientes = solicitudes.filter(s => s.paso === 3);
  const procesadas = solicitudes.filter(s => s.paso > 3);
  const posRechazadas = selected ? Object.values(formPosiciones).filter(f => f.rechazada).length : 0;
  const posAprobables = selected ? posicionesAprobables().length : 0;

  return (
    <div style={s.wrap}>
      {/* PENDIENTES */}
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Pendientes de aprobar</h2>
            <p style={s.sub}>Paso 3: Aprueba o rechaza solicitudes</p>
          </div>
          <span style={{fontSize:13, color:'#9ca3af'}}>{pendientes.length} pendientes</span>
        </div>
        {loading ? (
          <div style={s.loading}>Cargando…</div>
        ) : pendientes.length === 0 ? (
          <div style={s.empty}>No hay solicitudes pendientes</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>{['Ticket','Solicitante','País','Acción'].map(h=>
                  <th key={h} style={s.th}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {pendientes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}>
                      <button style={s.btnRevisar} onClick={() => handleRevisar(sol)}>Revisar →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTORIAL */}
      {procesadas.length > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <h3 style={{...s.h2, fontSize:16}}>Historial ({procesadas.length})</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>{['Ticket','Solicitante','Estado','Fecha'].map(h=>
                  <th key={h} style={s.th}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {procesadas.map(sol => (
                  <tr key={sol.id} style={{opacity:.7}}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:12,
                        background: sol.estado==='Rechazada'?'#fef2f2':'#dcfce7',
                        color: sol.estado==='Rechazada'?'#dc2626':'#16a34a'}}>
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
        <div style={s.modalBg} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.mTitle}>Revisar Solicitud</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            {/* Resumen */}
            {selected.posiciones?.length > 1 && (
              <div style={s.resumenBar}>
                <span style={{color:'#16a34a', fontWeight:600}}>{posAprobables} aprobables</span>
                {posRechazadas > 0 && <>
                  <span style={{color:'#6b7280', margin:'0 8px'}}>·</span>
                  <span style={{color:'#dc2626', fontWeight:600}}>{posRechazadas} rechazadas</span>
                </>}
                <span style={{color:'#6b7280', marginLeft:'auto', fontSize:11}}>
                  Total: {selected.posiciones.length} posiciones
                </span>
              </div>
            )}

            {/* POSICIONES */}
            <div style={s.posicionesBox}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f1d3a', marginBottom:12}}>
                Posiciones de la solicitud ({selected.posiciones?.length || 0})
              </div>

              {selected.posiciones && selected.posiciones.map((pos, idx) => {
                const posForm = formPosiciones[pos.id] || {};
                const rechazada = posForm.rechazada;

                return (
                  <div key={pos.id} style={{
                    ...s.posicionItem,
                    borderLeft: rechazada ? '3px solid #dc2626' : '3px solid #16a34a',
                    opacity: rechazada ? 0.6 : 1,
                  }}>
                    {/* Encabezado */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                      <span style={{fontSize:11, fontWeight:700, color:'#6b7280', letterSpacing:'.5px'}}>
                        POSICIÓN {idx + 1}
                      </span>
                      {rechazada ? (
                        <span style={{fontSize:10, fontWeight:700, color:'#dc2626', background:'#fef2f2', padding:'2px 8px', borderRadius:10}}>
                          ✗ Rechazada
                        </span>
                      ) : (
                        <span style={{fontSize:10, fontWeight:700, color:'#16a34a', background:'#dcfce7', padding:'2px 8px', borderRadius:10}}>
                          ✓ Aprobable
                        </span>
                      )}
                    </div>

                    {/* Datos */}
                    <div style={{marginBottom:8}}>
                      <div style={s.posLabel}>DENOMINACIÓN</div>
                      <div style={s.posValor}>{pos.denominacion}</div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <div style={s.posLabel}>UNIDAD DE MEDIDA</div>
                      <div style={s.posValor}>{pos.unidad_medida}</div>
                    </div>
                    {pos.texto_pedido && (
                      <div style={{marginBottom:10}}>
                        <div style={s.posLabel}>TEXTO DE PEDIDO</div>
                        <div style={{...s.posValor, color:'#6b7280', whiteSpace:'pre-wrap', maxHeight:50, overflow:'auto'}}>
                          {pos.texto_pedido}
                        </div>
                      </div>
                    )}

                    {/* Clasificación del Gestor */}
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
                      paddingTop:10, borderTop:'1px dashed #e2e5ef', marginBottom: rechazada ? 0 : 10}}>
                      <div>
                        <div style={s.posLabel}>TIPO DE MATERIAL</div>
                        <div style={{fontSize:13, fontWeight:600, color: pos.tipo_material ? '#0f1d3a' : '#9ca3af'}}>
                          {pos.tipo_material || '—'}
                        </div>
                      </div>
                      <div>
                        <div style={s.posLabel}>GRUPO DE ARTÍCULOS</div>
                        <div style={{fontSize:13, fontWeight:600, color: pos.grupo_articulos ? '#0f1d3a' : '#9ca3af'}}>
                          {pos.grupo_articulos || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Botón rechazar posición — solo si no está ya rechazada */}
                    {!rechazada && (
                      !posForm.mostrarRechazo ? (
                        <button style={s.btnRechazarPos}
                          onClick={() => handleChangePos(pos.id, 'mostrarRechazo', true)}>
                          ✗ Rechazar esta posición
                        </button>
                      ) : (
                        <div style={{marginTop:8, background:'#fef2f2', borderRadius:8, padding:10}}>
                          <div style={{fontSize:11, fontWeight:600, color:'#dc2626', marginBottom:6}}>
                            Motivo del rechazo
                          </div>
                          <textarea
                            style={{...s.input, minHeight:60, resize:'vertical', fontSize:12, marginBottom:8}}
                            placeholder="Indica el motivo…"
                            value={posForm.motivoRechazo || ''}
                            onChange={e => handleChangePos(pos.id, 'motivoRechazo', e.target.value)}
                          />
                          <div style={{display:'flex', gap:8}}>
                            <button style={{...s.btnRechazarPos, flex:1}}
                              onClick={() => handleChangePos(pos.id, 'mostrarRechazo', false)}>
                              Cancelar
                            </button>
                            <button
                              style={{...s.btnRechazarPos, flex:1, background:'#dc2626', color:'#fff', border:'none',
                                opacity: posForm.motivoRechazo ? 1 : 0.5}}
                              disabled={!posForm.motivoRechazo || saving}
                              onClick={() => handleRechazarPosicion(pos.id)}>
                              Confirmar rechazo
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botones principales */}
            <div style={{display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap'}}>
              <button style={s.btnCancel} onClick={() => setSelected(null)}>Cancelar</button>
              <button style={s.btnReject} onClick={handleRechazarTodo} disabled={saving}>
                ✗ Rechazar todo
              </button>
              <button
                style={{...s.btnApprove, opacity: hayAlgoAprobable() ? 1 : 0.5}}
                onClick={handleAprobarTodo}
                disabled={!hayAlgoAprobable() || saving}>
                {saving ? 'Procesando…' : posRechazadas > 0
                  ? `✓ Aprobar ${posAprobables} posición(es)`
                  : '✓ Aprobar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:          { padding:28 },
  card:          { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden', marginBottom:20 },
  header:        { padding:'20px 24px', borderBottom:'1px solid #e2e5ef', display:'flex', alignItems:'center', justifyContent:'space-between' },
  h2:            { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:           { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:       { padding:48, textAlign:'center', color:'#9ca3af' },
  empty:         { padding:48, textAlign:'center', color:'#9ca3af' },
  table:         { width:'100%', borderCollapse:'collapse' },
  th:            { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:            { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
  btnRevisar:    { padding:'5px 12px', background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:       { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:         { background:'#fff', borderRadius:16, padding:32, maxWidth:580, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)', maxHeight:'90vh', overflow:'auto' },
  mTitle:        { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:          { fontSize:13, color:'#6b7280', marginBottom:16 },
  resumenBar:    { display:'flex', alignItems:'center', background:'#f5f6fa', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:12 },
  posicionesBox: { background:'#f5f6fa', borderRadius:10, padding:14, marginBottom:16 },
  posicionItem:  { background:'#fff', borderRadius:8, padding:14, marginBottom:10, border:'1px solid #e2e5ef' },
  posLabel:      { fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:3, letterSpacing:'.5px', textTransform:'uppercase' },
  posValor:      { fontSize:13, color:'#111827' },
  label:         { display:'block', fontSize:12, fontWeight:600, color:'#374151' },
  input:         { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' },
  btnCancel:     { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnReject:     { padding:'10px 18px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnApprove:    { padding:'10px 22px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
  btnRechazarPos:{ padding:'6px 12px', background:'#fff', color:'#dc2626', border:'1px solid #fecaca', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', width:'100%' },
};
