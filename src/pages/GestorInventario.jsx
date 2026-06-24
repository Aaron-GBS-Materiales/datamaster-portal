// pages/GestorInventario.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, avanzarPaso } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const GRUPOS_ARTICULOS = ['Cemento','Agregados','Acero','Tubería','Equipos','Otros'];
const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function GestorInventario() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ tipoMaterial: '', grupoArticulos: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getSolicitudesPorPaso(2);
      setSolicitudes(data.filter(s => s.unidad_negocio === 'UNACEM PERU'));
    } catch {}
    setLoading(false);
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
      load();
    } catch {}
    setSaving(false);
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Revisión de Inventario</h2>
            <p style={s.sub}>Paso 2: Completa información del material</p>
          </div>
          <span style={{fontSize:13, color:'#9ca3af'}}>{solicitudes.length} pendientes</span>
        </div>

        {loading ? (
          <div style={s.loading}>Cargando…</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','Denominación','País','Estado','Acción'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis'}} title={sol.denominacion}>{sol.denominacion}</td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:12, background:'#eff4ff', color:'#2563eb'}}>
                        Paso 2
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={s.btnRevisar} onClick={()=>{setSelected(sol); setForm({ tipoMaterial: '', grupoArticulos: '' });}}>
                        Revisar →
                      </button>
                    </td>
                  </tr>
                ))}
                {solicitudes.length === 0 && (
                  <tr><td colSpan={6} style={{...s.td, textAlign:'center', color:'#9ca3af', padding:40}}>
                    No hay solicitudes pendientes de revisión
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div style={s.modalBg} onClick={()=>setSelected(null)}>
          <div style={s.modal} onClick={e=>e.stopPropagation()}>
            <h3 style={s.mTitle}>Revisar y Completar</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            <div style={s.infoBox}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Denominación
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.denominacion}</div>
              </div>
              <div>
                <div style={{fontSize:10, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3}}>
                  Unidad de Medida
                </div>
                <div style={{fontSize:13, color:'#111827'}}>{selected.unidad_medida}</div>
              </div>
            </div>

            <div style={{marginBottom:16}}>
              <label style={{...s.label, marginBottom:7}}>Tipo de Material <span style={{color:'#dc2626'}}>*</span></label>
              <input style={s.input} placeholder="Ej: Cemento Portland"
                value={form.tipoMaterial} onChange={e=>setForm({...form, tipoMaterial:e.target.value})} />
            </div>

            <div style={{marginBottom:20}}>
              <label style={{...s.label, marginBottom:7}}>Grupo de Artículos <span style={{color:'#dc2626'}}>*</span></label>
              <select style={s.select} value={form.grupoArticulos} onChange={e=>setForm({...form, grupoArticulos:e.target.value})}>
                <option value="">Seleccionar…</option>
                {GRUPOS_ARTICULOS.map(g=><option key={g}>{g}</option>)}
              </select>
            </div>

            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button style={s.btnCancel} onClick={()=>setSelected(null)}>Cancelar</button>
              <button style={s.btnComplete} onClick={handleCompletar} disabled={!form.tipoMaterial || !form.grupoArticulos || saving}>
                {saving ? 'Enviando…' : 'Enviar a Líder →'}
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
  card:       { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden' },
  header:     { padding:'20px 24px', borderBottom:'1px solid #e2e5ef', display:'flex', alignItems:'center', justifyContent:'space-between' },
  h2:         { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:        { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:    { padding:48, textAlign:'center', color:'#9ca3af' },
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
  input:      { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box' },
  select:     { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' },
  btnCancel:  { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnComplete:{ padding:'10px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
