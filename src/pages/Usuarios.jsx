// pages/Usuarios.jsx
import { useState, useEffect } from 'react';
import { getAllUsers, createUser, toggleUserActivo } from '../services/supabase';

const PAISES   = ['Perú','Colombia','Chile','Ecuador','Bolivia'];
const UNIDADES = [
  'UNACEM CHILE',
  'UNICON CHILE',
  'PREANSA COLOMBIA',
  'UNACEM ECUADOR',
  'UNACEM PERU',
  'INVECO',
  'CELEPSA - TERMOCHILCA',
  'DIGICEM',
  'UNACEM GBS',
  'GEA',
  'DECOSA',
  'INMA',
  'CISC',
  'PREANSA PERÚ',
  'VIGIANDINA',
  'UNACEM CORP',
  'CALCEM DRAKE CEMENT',
  'TEHACHAPI CEMENT'
];
const ROLES = [
  'SOLICITANTE',
  'GESTOR DE INVENTARIO',
  'LIDER DE CATEGORÍA',
  'DATA MASTER',
  'ADMINISTRADOR'
];
const FLAG     = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };
const EMPTY    = { nombre:'', email:'', pais:'', unidadNegocio:'', rol:'SOLICITANTE' };

export default function Usuarios() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [ok, setOk]           = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setUsers(await getAllUsers()); } catch {}
    setLoading(false);
  }

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.nombre||!form.email||!form.pais||!form.unidadNegocio) {
      setError('Completa todos los campos.'); return;
    }
    setError(''); setSaving(true);
    try {
      await createUser(form);
      setOk(`✓ ${form.nombre} agregado correctamente.`);
      setForm(EMPTY);
      setTimeout(()=>setOk(''),4000);
      load();
    } catch(err) {
      setError(err.message?.includes('duplicate') ? 'Este correo ya existe.' : 'Error al agregar.');
    }
    setSaving(false);
  }

  const activos   = users.filter(u=>u.activo);
  const inactivos = users.filter(u=>!u.activo);

  return (
    <div style={s.wrap}>
      {/* FORM */}
      <div style={s.card}>
        <div style={s.ch}>
          <h3 style={s.ct}>Agregar usuario</h3>
          <span style={s.cs}>El usuario podrá ingresar con este correo. Sus datos se registran automáticamente en cada solicitud.</span>
        </div>
        <form onSubmit={handleAdd} style={{padding:24}}>
          <div style={s.grid}>
            <div style={s.field}>
              <label style={s.label}>Nombre completo <span style={{color:'#dc2626'}}>*</span></label>
              <input style={s.input} placeholder="Ana García" value={form.nombre} onChange={e=>set('nombre',e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Correo corporativo <span style={{color:'#dc2626'}}>*</span></label>
              <input style={s.input} type="email" placeholder="ana@empresa.com" value={form.email} onChange={e=>set('email',e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>País <span style={{color:'#dc2626'}}>*</span></label>
              <select style={s.select} value={form.pais} onChange={e=>set('pais',e.target.value)}>
                <option value="">Seleccionar…</option>
                {PAISES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Unidad de negocio <span style={{color:'#dc2626'}}>*</span></label>
              <select style={s.select} value={form.unidadNegocio} onChange={e=>set('unidadNegocio',e.target.value)}>
                <option value="">Seleccionar…</option>
                {UNIDADES.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Rol</label>
              <select style={s.select} value={form.rol} onChange={e=>set('rol',e.target.value)}>
                <option value="">Seleccionar rol…</option>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {error && <div style={s.errorBox}>{error}</div>}
          {ok    && <div style={s.okBox}>{ok}</div>}
          <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
            <button style={s.btnPri} type="submit" disabled={saving}>
              {saving ? 'Guardando…' : '+ Agregar usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVOS */}
      <div style={s.card}>
        <div style={s.ch}><h3 style={s.ct}>Usuarios activos ({activos.length})</h3></div>
        {loading ? <div style={s.loading}>Cargando…</div> : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead><tr>{['Nombre','Correo','País','Unidad','Rol','Acción'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {activos.map(u=>(
                  <tr key={u.id}>
                    <td style={s.td}><strong>{u.nombre}</strong></td>
                    <td style={{...s.td,fontFamily:'monospace',fontSize:12,color:'#2563eb'}}>{u.email}</td>
                    <td style={s.td}>{FLAG[u.pais]||''} {u.pais}</td>
                    <td style={s.td}>{u.unidad_negocio}</td>
                    <td style={s.td}>
                      <span style={u.rol==='ADMINISTRADOR'?{...s.badgeAdmin}:u.rol==='DATA MASTER'?{...s.badgeDataMaster}:{...s.badgeSol}}>
                        {u.rol}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button style={s.btnDes} onClick={()=>{toggleUserActivo(u.id,false);load();}}>Desactivar</button>
                    </td>
                  </tr>
                ))}
                {activos.length===0&&<tr><td colSpan={6} style={{...s.td,textAlign:'center',color:'#9ca3af',padding:24}}>Sin usuarios activos</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INACTIVOS */}
      {inactivos.length>0&&(
        <div style={s.card}>
          <div style={s.ch}><h3 style={{...s.ct,color:'#9ca3af'}}>Desactivados ({inactivos.length})</h3></div>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead><tr>{['Nombre','Correo','País','Unidad','Acción'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {inactivos.map(u=>(
                  <tr key={u.id} style={{opacity:.6}}>
                    <td style={s.td}>{u.nombre}</td>
                    <td style={{...s.td,fontFamily:'monospace',fontSize:12}}>{u.email}</td>
                    <td style={s.td}>{FLAG[u.pais]||''} {u.pais}</td>
                    <td style={s.td}>{u.unidad_negocio}</td>
                    <td style={s.td}>
                      <button style={s.btnAct} onClick={()=>{toggleUserActivo(u.id,true);load();}}>Reactivar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:      { padding:28, display:'flex', flexDirection:'column', gap:20 },
  card:      { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden' },
  ch:        { padding:'16px 24px', borderBottom:'1px solid #e2e5ef' },
  ct:        { fontSize:15, fontWeight:700, color:'#0f1d3a', margin:0 },
  cs:        { fontSize:12, color:'#6b7280', marginTop:4, display:'block' },
  grid:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:8 },
  field:     { display:'flex', flexDirection:'column', gap:6 },
  label:     { fontSize:12, fontWeight:600, color:'#374151' },
  input:     { padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none' },
  select:    { padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', background:'#fff' },
  errorBox:  { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626', marginTop:12 },
  okBox:     { background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#16a34a', marginTop:12 },
  btnPri:    { padding:'10px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
  loading:   { padding:32, textAlign:'center', color:'#9ca3af' },
  table:     { width:'100%', borderCollapse:'collapse' },
  th:        { padding:'9px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:        { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
  badgeAdmin:{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:'#ede9fe', color:'#7c3aed', border:'1px solid #ddd6fe' },
  badgeDataMaster:{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:'#dcfce7', color:'#15803d', border:'1px solid #86efac' },
  badgeSol:  { fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:20, background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe' },
  btnDes:    { padding:'5px 12px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  btnAct:    { padding:'5px 12px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
};
