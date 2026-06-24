import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, avanzarPaso, rechazarSolicitud, getPosicionesBySolicitud } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { TIPOS_MATERIAL, GRUPOS_ARTICULOS } from '../constants/materiales';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function GestorInventario() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ tipoMaterial: '', grupoArticulos: '' });
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
    setForm({ tipoMaterial: '', grupoArticulos: '' });
    setMotivo('');
    setAction(null);
  }

  async function handleCompletar() {
    if (!form.tipoMaterial || !form.grupoArticulos) return;
    setSaving(true);
    try {
      await avanzarPaso(selected.id, 3, {
        tipo_material: form.tipoMaterial,
        grupo_articulos: form.grupoArticulos,
        asignado_a: user.email,
      });
      setSelected(null);
      setForm({ tipoMaterial: '', grupoArticulos: '' });
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
  const gruposDisponibles = form.tipoMaterial ? (GRUPOS_ARTICULOS[form.tipoMaterial] || []) : [];

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
                  {['Ticket','Solicitante','Tipo Material','Grupo','Estado','Fecha'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {procesadas.map(sol => (
                  <tr key={sol.id} style={{opacity:.7}}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>{sol.tipo_material || '—'}</td>
                    <td style={s.td}>{sol.grupo_articulos || '—'}</td>
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

            <div style={s.posicionesBox}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f1d3a', marginBottom:12}}>Posiciones solicitadas</div>
              {selected.posiciones && selected.posiciones.map((pos, idx) => (
                <div key={pos.id} style={{marginBottom:14, paddingBottom:14, borderBottom: idx < selected.posiciones.length - 1 ? '1px solid #e2e5ef' : 'none'}}>
                  <div style={{fontSize:11, fontWeight:600, color:'#9ca3af', marginBottom:8}}>POSICION {idx + 1}</div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:2}}>DENOMINACION</div>
                    <div style={{fontSize:13, color:'#111827'}}>{pos.denominacion}</div>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:2}}>UNIDAD DE MEDIDA</div>
                    <div style={{fontSize:13, color:'#111827'}}>{pos.unidad_medida}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:2}}>TEXTO DE PEDIDO</div>
                    <div style={{fontSize:13, color:'#111827', whiteSpace:'pre-wrap', maxHeight:60, overflow:'auto'}}>{pos.texto_pedido}</div>
                  </div>
                </div>
              ))}
            </div>

            {action !== 'rechazar' ? (
              <>
                <div style={{marginBottom:16}}>
                  <label style={{...s.label, marginBottom:7}}>Tipo de Material <span style={{color:'#dc2626'}}>*</span></label>
                  <select style={s.select} value={form.tipoMaterial} onChange={e=>{setForm({tipoMaterial:e.target.value, grupoArticulos:''});}}>
                    <option value="">Seleccionar tipo…</option>
                    {TIPOS_MATERIAL.map(t=><option key={t.codigo} value={t.codigo}>{t.codigo} - {t.nombre}</option>)}
                  </select>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={{...s.label, marginBottom:7}}>Grupo de Artículos <span style={{color:'#dc2626'}}>*</span></label>
                  <select style={s.select} value={form.grupoArticulos} onChange={e=>setForm({...form, grupoArticulos:e.target.value})} disabled={!form.tipoMaterial}>
                    <option value="">Seleccionar grupo…</option>
                    {gruposDisponibles.map(g=><option key={g.codigo} value={g.codigo}>{g.codigo} - {g.nombre}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div style={{marginBottom:20}}>
                <label style={{...s.label, marginBottom:7}}>Motivo del rechazo</label>
                <textarea style={{...s.input, resize:'vertical', minHeight:80}} placeholder="Indica por qué se rechaza esta solicitud"
                  value={motivo} onChange={e=>setMotivo(e.target.value)} />
              </div>
            )}

            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button style={s.btnCancel} onClick={()=>setSelected(null)}>Cancelar</button>
              {action === null ? (
                <>
                  <button style={s.btnReject} onClick={()=>setAction('rechazar')} disabled={saving}>
                    ✗ Rechazar
                  </button>
                  <button style={s.btnComplete} onClick={handleCompletar} disabled={!form.tipoMaterial || !form.grupoArticulos || saving}>
                    {saving ? 'Enviando…' : 'Enviar a Líder →'}
                  </button>
                </>
              ) : (
                <>
                  <button style={s.btnCancel} onClick={()=>setAction(null)}>Atrás</button>
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
  wrap:       { padding:28 },
  card:       { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden', marginBottom:20 },
  header:     { padding:'20px 24px', borderBottom:'1px solid #e2e5ef', display:'flex', alignItems:'center', justifyContent:'space-between' },
  h2:         { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:        { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:    { padding:48, textAlign:'center', color:'#9ca3af' },
  empty:      { padding:48, textAlign:'center', color:'#9ca3af' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:         { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
  btnRevisar: { padding:'5px 12px', background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:    { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:      { background:'#fff', borderRadius:16, padding:32, maxWidth:520, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)', maxHeight:'90vh', overflow:'auto' },
  mTitle:     { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:       { fontSize:13, color:'#6b7280', marginBottom:20 },
  posicionesBox:{ background:'#f5f6fa', borderRadius:8, padding:14, marginBottom:20 },
  label:      { display:'block', fontSize:12, fontWeight:600, color:'#374151' },
  input:      { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' },
  select:     { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' },
  btnCancel:  { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnReject:  { padding:'10px 18px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnComplete:{ padding:'10px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
