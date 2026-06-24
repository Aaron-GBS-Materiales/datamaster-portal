// pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { getSolicitudes, atenderSolicitud, updateEstado } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const BADGE = {
  Pendiente:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  'En proceso': { bg:'#eff4ff', color:'#2563eb', border:'#bfdbfe' },
  Atendida:     { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
};
const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function Dashboard({ soloMias = false }) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [codigos, setCodigos]         = useState('');
  const [fEstado, setFEstado]         = useState('');
  const [fPais, setFPais]             = useState('');

  useEffect(() => { load(); }, [soloMias]);

  async function load() {
    setLoading(true);
    try {
      const data = await getSolicitudes(soloMias ? user.email : null);
      setSolicitudes(data);
    } catch {}
    setLoading(false);
  }

  async function handleEnProceso(sol) {
    await updateEstado(sol.id, 'En proceso');
    load();
  }

  async function handleAtender() {
    if (!selected || !codigos) return;
    await atenderSolicitud(selected.id, user.email, codigos);
    setSelected(null); setCodigos('');
    load();
  }

  const filtered = solicitudes.filter(s => {
    if (fEstado && s.estado !== fEstado) return false;
    if (fPais   && s.pais   !== fPais)   return false;
    return true;
  });

  const kpis = [
    { label:'Pendientes',      value: solicitudes.filter(s=>s.estado==='Pendiente').length,    color:'#d97706' },
    { label:'En proceso',      value: solicitudes.filter(s=>s.estado==='En proceso').length,   color:'#2563eb' },
    { label:'Atendidas',       value: solicitudes.filter(s=>s.estado==='Atendida').length,     color:'#16a34a' },
    { label:'Códigos creados', value: solicitudes.reduce((a,s)=>a+(s.cantidad_codigos||0),0),  color:'#0f1d3a' },
  ];

  return (
    <div style={s.wrap}>
      {/* KPIs */}
      <div style={s.kpiGrid}>
        {kpis.map(k => (
          <div key={k.label} style={s.kpiCard}>
            <div style={s.kpiLabel}>{k.label}</div>
            <div style={{...s.kpiVal, color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      {!soloMias && (
        <div style={s.filterBar}>
          <select style={s.sel} value={fEstado} onChange={e=>setFEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option>Pendiente</option><option>En proceso</option><option>Atendida</option>
          </select>
          <select style={s.sel} value={fPais} onChange={e=>setFPais(e.target.value)}>
            <option value="">Todos los países</option>
            {['Perú','Colombia','Chile','Ecuador','Bolivia'].map(p=><option key={p}>{p}</option>)}
          </select>
          <button style={s.btnRefresh} onClick={load}>↻ Actualizar</button>
          <span style={s.count}>{filtered.length} solicitudes</span>
        </div>
      )}

      {/* TABLE */}
      <div style={s.tableCard}>
        {loading ? (
          <div style={s.loading}>Cargando solicitudes…</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','País','Unidad','Denominación','U.M.','Estado','Recibida','Acciones']
                    .map(h=><th key={h} style={s.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600, fontSize:12, whiteSpace:'nowrap'}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}>{sol.unidad_negocio}</td>
                    <td style={{...s.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={sol.denominacion}>{sol.denominacion}</td>
                    <td style={{...s.td, textAlign:'center'}}>{sol.unidad_medida}</td>
                    <td style={s.td}>
                      <span style={{...s.badge, background:BADGE[sol.estado]?.bg, color:BADGE[sol.estado]?.color, border:`1px solid ${BADGE[sol.estado]?.border}`}}>
                        {sol.estado}
                      </span>
                    </td>
                    <td style={{...s.td, fontSize:12, color:'#6b7280', whiteSpace:'nowrap'}}>
                      {sol.fecha_recepcion ? new Date(sol.fecha_recepcion).toLocaleString('es-PE') : '—'}
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>
                      {sol.estado==='Pendiente' && user?.rol !== 'SOLICITANTE' && (
                        <button style={s.btnProg} onClick={()=>handleEnProceso(sol)}>En proceso</button>
                      )}
                      {sol.estado==='En proceso' && user?.rol !== 'SOLICITANTE' && (
                        <button style={s.btnAtend} onClick={()=>setSelected(sol)}>✓ Atender</button>
                      )}
                      {sol.estado==='Atendida' && (
                        <span style={{fontSize:12,color:'#16a34a'}}>✓ Completada</span>
                      )}
                      {soloMias && sol.estado!=='Atendida' && (
                        <span style={{fontSize:12,color:'#d97706'}}>En espera</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && (
                  <tr><td colSpan={9} style={{...s.td, textAlign:'center', color:'#9ca3af', padding:40}}>
                    No hay solicitudes
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ATENDER */}
      {selected && (
        <div style={s.modalBg} onClick={()=>setSelected(null)}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <h3 style={s.mTitle}>Marcar como atendida</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>
            <div style={s.detailBox}>
              {[
                ['Denominación', selected.denominacion],
                ['Unidad de medida', selected.unidad_medida],
                ['Texto pedido', selected.texto_pedido],
              ].map(([l,v])=>(
                <div key={l} style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:13,color:'#111827'}}>{v}</div>
                </div>
              ))}
            </div>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:7}}>
              Cantidad de códigos creados en SAP <span style={{color:'#dc2626'}}>*</span>
            </label>
            <input style={{...s.mInput}} type="number" min="1" placeholder="Ej: 5"
              value={codigos} onChange={e=>setCodigos(e.target.value)} />
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button style={s.btnSec} onClick={()=>setSelected(null)}>Cancelar</button>
              <button style={s.btnPri} onClick={handleAtender} disabled={!codigos}>Confirmar →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:      { padding:28 },
  kpiGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
  kpiCard:   { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:20 },
  kpiLabel:  { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:8 },
  kpiVal:    { fontSize:30, fontWeight:800, letterSpacing:'-1px' },
  filterBar: { display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' },
  sel:       { padding:'8px 12px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:13, background:'#fff', outline:'none' },
  btnRefresh:{ padding:'8px 14px', background:'#f5f6fa', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
  count:     { marginLeft:'auto', fontSize:13, color:'#9ca3af' },
  tableCard: { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden' },
  loading:   { padding:48, textAlign:'center', color:'#9ca3af' },
  table:     { width:'100%', borderCollapse:'collapse' },
  th:        { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:        { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
  badge:     { fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, display:'inline-block' },
  btnProg:   { padding:'5px 12px', background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  btnAtend:  { padding:'5px 12px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:   { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:     { background:'#fff', borderRadius:16, padding:32, maxWidth:480, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)' },
  mTitle:    { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:      { fontSize:13, color:'#6b7280', marginBottom:20 },
  detailBox: { background:'#f5f6fa', borderRadius:8, padding:16, marginBottom:20 },
  mInput:    { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', marginBottom:20 },
  btnPri:    { padding:'10px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
  btnSec:    { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
};
