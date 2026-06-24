// pages/BaseDatos.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, atenderSolicitud } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function BaseDatos() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [codigos, setCodigos] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getSolicitudesPorPaso(4);
      setSolicitudes(data);
    } catch {}
    setLoading(false);
  }

  async function handleCrear() {
    if (!codigos) return;
    setSaving(true);
    try {
      await atenderSolicitud(selected.id, user.email, codigos);
      setSelected(null);
      setCodigos('');
      load();
    } catch {}
    setSaving(false);
  }

  const completadas = solicitudes.filter(s => s.estado === 'Atendida').length;
  const pendientes = solicitudes.length - completadas;

  return (
    <div style={s.wrap}>
      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Pendientes de crear</div>
          <div style={{...s.kpiVal, color:'#f59e0b'}}>{pendientes}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Códigos creados hoy</div>
          <div style={{...s.kpiVal, color:'#16a34a'}}>{completadas}</div>
        </div>
      </div>

      {/* TABLE */}
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Crear Códigos SAP</h2>
            <p style={s.sub}>Paso 4: Crea códigos y confirma en el sistema</p>
          </div>
        </div>

        {loading ? (
          <div style={s.loading}>Cargando…</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','Denominación','Flujo','Grupo','Acción'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {solicitudes.filter(s => s.estado !== 'Atendida').map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis'}} title={sol.denominacion}>{sol.denominacion}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:12, background:sol.flujo==='extendido'?'#fef3c7':'#dbeafe', color:sol.flujo==='extendido'?'#b45309':'#1e40af'}}>
                        {sol.flujo==='extendido'?'Revisión':'Directo'}
                      </span>
                    </td>
                    <td style={s.td}>{sol.grupo_articulos || '—'}</td>
                    <td style={s.td}>
                      <button style={s.btnCrear} onClick={()=>{setSelected(sol); setCodigos('');}}>
                        Crear →
                      </button>
                    </td>
                  </tr>
                ))}
                {solicitudes.filter(s => s.estado !== 'Atendida').length === 0 && (
                  <tr><td colSpan={6} style={{...s.td, textAlign:'center', color:'#9ca3af', padding:40}}>
                    Todas las solicitudes han sido procesadas
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTORIAL */}
      {completadas > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <h3 style={{...s.h2, fontSize:16}}>Completadas hoy ({completadas})</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','Códigos','Completado por','Fecha'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {solicitudes.filter(s => s.estado === 'Atendida').map(sol => (
                  <tr key={sol.id} style={{opacity:.7}}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#16a34a', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, fontWeight:600, color:'#16a34a'}}>{sol.cantidad_codigos}</td>
                    <td style={s.td}>{sol.atendido_por}</td>
                    <td style={{...s.td, fontSize:12, color:'#6b7280'}}>
                      {sol.fecha_respuesta ? new Date(sol.fecha_respuesta).toLocaleString('es-PE') : '—'}
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
            <h3 style={s.mTitle}>Crear Códigos en SAP</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            <div style={s.infoBox}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Material
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.denominacion}</div>
              </div>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Tipo / Grupo
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.tipo_material} / {selected.grupo_articulos}</div>
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Flujo
                </div>
                <div style={{fontSize:13, color:'#111827'}}>
                  {selected.flujo === 'extendido' ? 'Paso 4 (con aprobaciones)' : 'Paso 4 (directo)'}
                </div>
              </div>
            </div>

            <div>
              <label style={{...s.label, marginBottom:7}}>Cantidad de códigos creados <span style={{color:'#dc2626'}}>*</span></label>
              <input style={{...s.input, fontSize:18, fontWeight:700, textAlign:'center', letterSpacing:2}} 
                type="number" min="1" placeholder="0" value={codigos} onChange={e=>setCodigos(e.target.value)} />
            </div>

            <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:24}}>
              <button style={s.btnCancel} onClick={()=>setSelected(null)}>Cancelar</button>
              <button style={s.btnConfirm} onClick={handleCrear} disabled={!codigos || saving}>
                {saving ? 'Creando…' : '✓ Confirmar Creación'}
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
  kpiGrid:    { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:24 },
  kpiCard:    { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:20 },
  kpiLabel:   { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:8 },
  kpiVal:     { fontSize:30, fontWeight:800, letterSpacing:'-1px' },
  card:       { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden', marginBottom:20 },
  header:     { padding:'20px 24px', borderBottom:'1px solid #e2e5ef' },
  h2:         { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:        { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:    { padding:48, textAlign:'center', color:'#9ca3af' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:         { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
  btnCrear:   { padding:'5px 12px', background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:    { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:      { background:'#fff', borderRadius:16, padding:32, maxWidth:480, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)' },
  mTitle:     { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:       { fontSize:13, color:'#6b7280', marginBottom:20 },
  infoBox:    { background:'#f5f6fa', borderRadius:8, padding:16, marginBottom:20 },
  label:      { display:'block', fontSize:12, fontWeight:600, color:'#374151' },
  input:      { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' },
  btnCancel:  { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnConfirm: { padding:'10px 22px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
