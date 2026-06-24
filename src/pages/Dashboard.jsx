// pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, getSolicitudById, getPosicionesBySolicitud } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

export default function Dashboard({ soloMias }) {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const isAdmin = user?.rol === 'ADMINISTRADOR' || user?.rol === 'DATA MASTER';
  const isGestor = user?.rol === 'GESTOR DE INVENTARIO';
  const isLider = user?.rol === 'LIDER DE CATEGORÍA';

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      let data = [];
      
      if (isGestor) {
        const paso2 = await getSolicitudesPorPaso(2);
        const paso3 = await getSolicitudesPorPaso(3);
        const paso4 = await getSolicitudesPorPaso(4);
        const paso5 = await getSolicitudesPorPaso(5);
        data = [...paso2, ...paso3, ...paso4, ...paso5].filter(s => s.unidad_negocio === 'UNACEM PERU');
      } else if (isLider) {
        const paso3 = await getSolicitudesPorPaso(3);
        const paso4 = await getSolicitudesPorPaso(4);
        const paso5 = await getSolicitudesPorPaso(5);
        data = [...paso3, ...paso4, ...paso5];
      } else if (isAdmin) {
        data = await getSolicitudesPorPaso(5);
      } else {
        const paso1 = await getSolicitudesPorPaso(1);
        const paso2 = await getSolicitudesPorPaso(2);
        const paso3 = await getSolicitudesPorPaso(3);
        const paso4 = await getSolicitudesPorPaso(4);
        const paso5 = await getSolicitudesPorPaso(5);
        data = [...paso1, ...paso2, ...paso3, ...paso4, ...paso5].filter(s => s.email_solicitante === user?.email);
      }
      
      const dataConPosiciones = await Promise.all(data.map(async (sol) => {
        const pos = await getPosicionesBySolicitud(sol.id);
        return {...sol, posiciones: pos};
      }));
      
      setSolicitudes(dataConPosiciones);
    } catch {}
    setLoading(false);
  }

  async function handleVerDetalle(id) {
    try {
      const det = await getSolicitudById(id);
      const pos = await getPosicionesBySolicitud(id);
      setDetalle({...det, posiciones: pos});
      setSelected(id);
    } catch {}
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
                  {['Ticket','Solicitante','Denominación','Tipo Material','Grupo','Estado','Paso','Acción'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {solicitudes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>{sol.ticket_id}</td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis'}} title={sol.posiciones?.[0]?.denominacion || '—'}>{sol.posiciones?.[0]?.denominacion || '—'}</td>
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
                    <td style={s.td}>
                      <button style={s.btnVer} onClick={() => handleVerDetalle(sol.id)}>
                        Ver →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALLE */}
      {selected && detalle && (
        <div style={s.modalBg} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.mTitle}>Detalle de Solicitud</h3>
            <p style={s.mSub}>{detalle.ticket_id}</p>

            <div style={s.seccion}>
              <div style={s.seccionTitle}>Posiciones</div>
              {detalle.posiciones && detalle.posiciones.length > 0 ? (
                detalle.posiciones.map((pos, idx) => (
                  <div key={pos.id} style={{marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #e2e5ef'}}>
                    <div style={{fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 8}}>Posicion {idx + 1}</div>
                    <div style={s.grid2}>
                      <div>
                        <div style={s.label}>Denominacion</div>
                        <div style={s.valor}>{pos.denominacion}</div>
                      </div>
                      <div>
                        <div style={s.label}>Unidad de Medida</div>
                        <div style={s.valor}>{pos.unidad_medida}</div>
                      </div>
                    </div>
                    <div style={{marginTop: 12}}>
                      <div style={s.label}>Texto de Pedido</div>
                      <div style={{...s.valor, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto'}}>{pos.texto_pedido}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{color: '#9ca3af', fontSize: 13}}>Sin posiciones</div>
              )}
            </div>

            <div style={s.seccion}>
              <div style={s.seccionTitle}>Estado</div>
              <div style={s.grid2}>
                <div>
                  <div style={s.label}>Estado</div>
                  <div style={s.valor}>{detalle.estado}</div>
                </div>
                <div>
                  <div style={s.label}>Paso</div>
                  <div style={s.valor}>{detalle.paso}</div>
                </div>
              </div>
              {detalle.cantidad_codigos && (
                <div style={{marginTop: 12}}>
                  <div style={s.label}>Código SAP Asignado</div>
                  <div style={{...s.valor, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: 10, borderRadius: 6}}>
                    {detalle.cantidad_codigos}
                  </div>
                </div>
              )}
            </div>

            <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 24}}>
              <button style={s.btnCerrar} onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
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
  btnVer:     { padding:'5px 12px', background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:    { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:      { background:'#fff', borderRadius:16, padding:32, maxWidth:600, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)', maxHeight:'90vh', overflow:'auto' },
  mTitle:     { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:       { fontSize:13, color:'#6b7280', marginBottom:20 },
  seccion:    { marginBottom:24, paddingBottom:24, borderBottom:'1px solid #e2e5ef' },
  seccionTitle:{ fontSize:13, fontWeight:700, color:'#0f1d3a', marginBottom:12 },
  grid2:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  label:      { fontSize:11, fontWeight:600, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 },
  valor:      { fontSize:13, color:'#111827' },
  btnCerrar:  { padding:'10px 24px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
