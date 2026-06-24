// pages/LiderCategoria.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, avanzarPaso, rechazarSolicitud } from '../services/supabase';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function LiderCategoria() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getSolicitudesPorPaso(3);
      setSolicitudes(data);
    } catch {}
    setLoading(false);
  }

  async function handleAprobar() {
    setSaving(true);
    try {
      await avanzarPaso(selected.id, 4, {
        aprobado_por_lider: true,
        estado: 'Aprobada',
      });
      setSelected(null);
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
      load();
    } catch {}
    setSaving(false);
  }

  const pendientes = solicitudes.filter(s => s.paso === 3);
  const procesadas = solicitudes.filter(s => s.paso > 3);

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
                <tr>
                  {['Ticket','Solicitante','Tipo Material','Grupo','País','Acción'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pendientes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>{sol.tipo_material || '—'}</td>
                    <td style={s.td}>{sol.grupo_articulos || '—'}</td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}>
                      <button style={s.btnRevisar} onClick={()=>setSelected(sol)}>
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

      {/* HISTORIAL */}
      {procesadas.length > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <h3 style={{...s.h2, fontSize:16}}>Historial ({procesadas.length})</h3>
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
            <h3 style={s.mTitle}>Revisar Solicitud</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            <div style={s.infoBox}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Denominación
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.denominacion}</div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Tipo de Material
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.tipo_material || '—'}</div>
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Grupo de Artículos
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.grupo_articulos || '—'}</div>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{...s.label, marginBottom:7}}>Si rechazas, indica el motivo</label>
              <textarea style={{...s.input, resize:'vertical', minHeight:80}} placeholder="Motivo del rechazo (opcional)"
                value={motivo} onChange={e=>setMotivo(e.target.value)} />
            </div>

            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button style={s.btnCancel} onClick={()=>setSelected(null)}>Cancelar</button>
              <button style={s.btnReject} onClick={handleRechazar} disabled={!motivo || saving}>
                {saving ? 'Procesando…' : '✗ Rechazar'}
              </button>
              <button style={s.btnApprove} onClick={handleAprobar} disabled={saving}>
                {saving ? 'Procesando…' : '✓ Aprobar'}
              </button>
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
  modal:      { background:'#fff', borderRadius:16, padding:32, maxWidth:480, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)' },
  mTitle:     { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:       { fontSize:13, color:'#6b7280', marginBottom:20 },
  infoBox:    { background:'#f5f6fa', borderRadius:8, padding:16, marginBottom:20 },
  label:      { display:'block', fontSize:12, fontWeight:600, color:'#374151' },
  input:      { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' },
  btnCancel:  { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnReject:  { padding:'10px 18px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnApprove: { padding:'10px 22px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
