// pages/NuevaSolicitud.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createSolicitud } from '../services/supabase';

const UNIDADES = ['UN','KG','MT','LT','GL','TN','M2','M3','CJ','BL','PAR','JGO','RLL'];

const TIPOS_MATERIAL = ['Cemento','Agregados','Aditivos','Tuberías','Acero','Otros'];
const ORIGENES = ['Nacional','Importado','Ambos'];

export default function NuevaSolicitud({ onSuccess }) {
  const { user } = useAuth();
  const [form, setForm]       = useState({ denominacion:'', unidadMedida:'', textoPedido:'', tipoMaterial:'', origen:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.denominacion || !form.unidadMedida || !form.textoPedido || !form.tipoMaterial || !form.origen) {
      setError('Completa todos los campos antes de enviar.'); return;
    }
    setError(''); setLoading(true);
    try {
      const flujo = user.unidadNegocio === 'UNACEM PERU' ? 'extendido' : 'directo';
      const sol = await createSolicitud({
        email:         user.email,
        nombre:        user.nombre,
        pais:          user.pais,
        unidadNegocio: user.unidadNegocio,
        denominacion:  form.denominacion,
        unidadMedida:  form.unidadMedida,
        textoPedido:   form.textoPedido,
        tipoMaterial:  form.tipoMaterial,
        origen:        form.origen,
        flujo,
      });
      onSuccess(sol.ticket_id);
      setForm({ denominacion:'', unidadMedida:'', textoPedido:'', tipoMaterial:'', origen:'' });
    } catch {
      setError('Error al enviar la solicitud. Intenta nuevamente.');
    }
    setLoading(false);
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Nueva solicitud</h2>
            <p style={s.headerSub}>Creación de código SAP</p>
          </div>
          <div style={s.userPill}>
            <div style={s.avatar}>{user.nombre.charAt(0)}</div>
            <div>
              <div style={s.userName}>{user.nombre}</div>
              <div style={s.userMeta}>{user.pais} · {user.unidadNegocio}</div>
            </div>
          </div>
        </div>

        <div style={s.infoBanner}>
          <span>ℹ️</span>
          <span style={{fontSize:13, color:'#1e40af'}}>
            Tus datos se registran automáticamente. Solo completa los campos del material.
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{padding:'20px 24px 24px'}}>
          <div style={s.field}>
            <label style={s.label}>Denominación del material <span style={{color:'#dc2626'}}>*</span></label>
            <input style={s.input} type="text"
              placeholder='Ej: TUBO ACERO AL CARBONO SIN COSTURA 2" SCH40'
              value={form.denominacion} onChange={e => set('denominacion', e.target.value)} />
            <span style={s.hint}>Escribe el nombre lo más descriptivo posible.</span>
          </div>

          <div style={s.field}>
            <label style={s.label}>Unidad de medida <span style={{color:'#dc2626'}}>*</span></label>
            <select style={s.select} value={form.unidadMedida} onChange={e => set('unidadMedida', e.target.value)}>
              <option value="">Seleccionar unidad…</option>
              {UNIDADES.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Tipo de material <span style={{color:'#dc2626'}}>*</span></label>
            <select style={s.select} value={form.tipoMaterial} onChange={e => set('tipoMaterial', e.target.value)}>
              <option value="">Seleccionar tipo…</option>
              {TIPOS_MATERIAL.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Origen del material <span style={{color:'#dc2626'}}>*</span></label>
            <select style={s.select} value={form.origen} onChange={e => set('origen', e.target.value)}>
              <option value="">Seleccionar origen…</option>
              {ORIGENES.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.actions}>
            <button type="button" style={s.btnSecondary}
              onClick={() => setForm({ denominacion:'', unidadMedida:'', textoPedido:'' })}>
              Limpiar
            </button>
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar solicitud →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap:       { padding:28, maxWidth:720, margin:'0 auto' },
  card:       { background:'#fff', borderRadius:12, border:'1px solid #e2e5ef', boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' },
  header:     { padding:'20px 24px', borderBottom:'1px solid #e2e5ef', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' },
  h2:         { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  headerSub:  { fontSize:12, color:'#6b7280', marginTop:3 },
  userPill:   { display:'flex', alignItems:'center', gap:10, background:'#f5f6fa', borderRadius:10, padding:'8px 14px', border:'1px solid #e2e5ef' },
  avatar:     { width:32, height:32, borderRadius:'50%', background:'#2563eb', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 },
  userName:   { fontSize:13, fontWeight:600, color:'#111827' },
  userMeta:   { fontSize:11, color:'#6b7280' },
  infoBanner: { margin:'16px 24px 0', background:'#eff4ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', display:'flex', alignItems:'center', gap:10 },
  field:      { marginBottom:18 },
  label:      { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:7 },
  input:      { width:'100%', padding:'11px 14px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, color:'#111827', outline:'none', boxSizing:'border-box' },
  select:     { width:'100%', padding:'11px 14px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, color:'#111827', outline:'none', boxSizing:'border-box', background:'#fff' },
  textarea:   { width:'100%', padding:'11px 14px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, color:'#111827', outline:'none', boxSizing:'border-box', resize:'vertical', fontFamily:'Inter,sans-serif', lineHeight:1.6 },
  hint:       { fontSize:11, color:'#9ca3af', marginTop:5, display:'block' },
  errorBox:   { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', marginBottom:14 },
  actions:    { display:'flex', justifyContent:'flex-end', gap:10, paddingTop:20, borderTop:'1px solid #e2e5ef', marginTop:8 },
  btnPrimary: { padding:'10px 24px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
  btnSecondary:{ padding:'10px 20px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
};
