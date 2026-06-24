// pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, getAllSolicitudes } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function Dashboard({ soloMias }) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.rol === 'ADMINISTRADOR' || user?.rol === 'DATA MASTER';
  const isGestor = user?.rol === 'GESTOR DE INVENTARIO';
  const isLider = user?.rol === 'LIDER DE CATEGORÍA';

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      let data = [];
      
      if (isGestor) {
        // Gestor ve sus solicitudes procesadas (paso > 2)
        const paso2 = await getSolicitudesPorPaso(2);
        const paso3 = await getSolicitudesPorPaso(3);
        const paso4 = await getSolicitudesPorPaso(4);
        const paso5 = await getSolicitudesPorPaso(5);
        data = [...paso2, ...paso3, ...paso4, ...paso5].filter(s => s.unidad_negocio === 'UNACEM PERU');
      } else if (isLider) {
        // Líder ve sus solicitudes procesadas (paso > 3)
        const paso3 = await getSolicitudesPorPaso(3);
        const paso4 = await getSolicitudesPorPaso(4);
        const paso5 = await getSolicitudesPorPaso(5);
        data = [...paso3, ...paso4, ...paso5];
      } else {
        // Admin ve solicitudes completadas (paso 5)
        data = await getSolicitudesPorPaso(5);
      }
      
      setSolicitudes(data);
    } catch {}
    setLoading(false);
  }

  const pendientes = solicitudes.filter(s => s.paso < 5);
  const completadas = solicitudes.filter(s => s.paso === 5);
  
  const estadoCounts = {
    pendientes: pendientes.length,
    completadas: completadas.length,
    total: solicitudes.length,
  };

  const getTitle = () => {
    if (isGestor) return 'Mi Historial - Gestor de Inventario';
    if (isLider) return 'Mi Historial - Líder de Categoría';
    return 'Dashboard';
  };

  const getSubtitle = () => {
    if (isGestor) return 'Solicitudes que he revisado y procesado';
    if (isLider) return 'Solicitudes que he aprobado o rechazado';
    return 'Solicitudes completadas';
  };

  return (
    <div style={s.wrap}>
      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>En proceso</div>
          <div style={{...s.kpiVal, color:'#f59e0b'}}>{estadoCounts.pendientes}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Completadas</div>
          <div style={{...s.kpiVal, color:'#16a34a'}}>{estadoCounts.completadas}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Total</div>
          <div style={{...s.kpiVal, color:'#2563eb'}}>{estadoCounts.total}</div>
        </div>
      </div>

      {/* TABLE */}
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>{getTitle()}</h2>
            <p style={s.sub}>{getSubtitle()}</p>
          </div>
        </div>

        {loading ? (
          <div style={s.loading}>Cargando…</div>
        ) : solicitudes.length === 0 ? (
          <div style={s.empty}>No hay solicitudes</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','Denominación','Tipo Material','Grupo','Estado','Paso','Fecha'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis'}} title={sol.denominacion}>{sol.denominacion}</td>
                    <td style={s.td}>{sol.tipo_material || '—'}</td>
                    <td style={s.td}>{sol.grupo_articulos || '—'}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:12, background:sol.estado==='Rechazada'?'#fef2f2':sol.estado==='Atendida'?'#dcfce7':'#eff4ff', color:sol.estado==='Rechazada'?'#dc2626':sol.estado==='Atendida'?'#16a34a':'#2563eb'}}>
                        {sol.estado}
                      </span>
                    </td>
                    <td style={{...s.td, textAlign:'center', fontSize:12, fontWeight:600}}>
                      {sol.paso}
                    </td>
                    <td style={{...s.td, fontSize:11, color:'#6b7280'}}>
                      {sol.fecha_recepcion ? new Date(sol.fecha_recepcion).toLocaleDateString('es-PE') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap:       { padding:28 },
  kpiGrid:    { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 },
  kpiCard:    { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:20 },
  kpiLabel:   { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:8 },
  kpiVal:     { fontSize:32, fontWeight:800, letterSpacing:'-1px' },
  card:       { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden' },
  header:     { padding:'20px 24px', borderBottom:'1px solid #e2e5ef' },
  h2:         { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:        { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:    { padding:48, textAlign:'center', color:'#9ca3af' },
  empty:      { padding:48, textAlign:'center', color:'#9ca3af' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:         { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8' },
};
