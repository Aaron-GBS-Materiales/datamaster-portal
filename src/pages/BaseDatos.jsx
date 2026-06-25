// pages/BaseDatos.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, atenderSolicitud,
         getPosicionesBySolicitud, actualizarPosicion } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { EstadoBadge } from '../utils/estadoHelper';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

function validarCodigo(codigo) {
  return /^\d{2}-\d{8}$/.test(codigo);
}

export default function BaseDatos() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [codigosPosicion, setCodigosPosicion] = useState({});
  // { [posId]: string }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const paso4 = await getSolicitudesPorPaso(4);
      const paso5 = await getSolicitudesPorPaso(5);
      setSolicitudes([...paso4, ...paso5]);
    } catch {}
    setLoading(false);
  }

  async function handleAbrir(sol) {
    const pos = await getPosicionesBySolicitud(sol.id);
    // Solo posiciones no rechazadas
    const posActivas = pos.filter(p => p.estado !== 'Rechazada');
    setSelected({...sol, posiciones: posActivas});
    // Inicializar códigos vacíos por posición
    const init = {};
    posActivas.forEach(p => { init[p.id] = p.codigo_sap || ''; });
    setCodigosPosicion(init);
    setError('');
  }

  function handleCambiarCodigo(posId, valor) {
    setCodigosPosicion(prev => ({...prev, [posId]: valor.toUpperCase()}));
  }

  const todasCompletas = () =>
    selected?.posiciones?.every(p => validarCodigo(codigosPosicion[p.id] || ''));

  async function handleRegistrar() {
    setError('');
    if (!todasCompletas()) {
      setError('Todos los códigos deben tener el formato correcto: XX-XXXXXXXX');
      return;
    }
    setSaving(true);
    try {
      // Guardar código SAP en cada posición
      await Promise.all(
        selected.posiciones.map(p =>
          actualizarPosicion(p.id, {
            codigo_sap: codigosPosicion[p.id],
            estado:     'Atendida',
          })
        )
      );

      // Marcar solicitud como atendida
      const codigos = selected.posiciones
        .map(p => codigosPosicion[p.id])
        .join(', ');
      await atenderSolicitud(selected.id, user.email, codigos);

      setSelected(null);
      setCodigosPosicion({});
      load();
    } catch {
      setError('Error al registrar los códigos');
    }
    setSaving(false);
  }

  const pendientes  = solicitudes.filter(s => s.paso === 4);
  const completadas = solicitudes.filter(s => s.paso === 5);

  return (
    <div style={s.wrap}>

      {/* KPIs */}
      <div style={s.kpiGrid}>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Pendientes de crear</div>
          <div style={{...s.kpiVal, color:'#f59e0b'}}>{pendientes.length}</div>
        </div>
        <div style={s.kpiCard}>
          <div style={s.kpiLabel}>Códigos creados hoy</div>
          <div style={{...s.kpiVal, color:'#16a34a'}}>{completadas.length}</div>
        </div>
      </div>

      {/* PENDIENTES */}
      <div style={s.card}>
        <div style={s.header}>
          <h2 style={s.h2}>Crear Códigos SAP</h2>
          <p style={s.sub}>Paso 4: Asigna código de material por posición</p>
        </div>

        {loading ? (
          <div style={s.loading}>Cargando…</div>
        ) : pendientes.length === 0 ? (
          <div style={s.empty}>Todas las solicitudes han sido procesadas</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','País','Unidad de Negocio','Flujo','Posiciones','Estado','Acción'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pendientes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>
                      {sol.ticket_id}
                    </td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:10,
                        background:'#eff4ff', color:'#2563eb'}}>
                        {sol.unidad_negocio || '—'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:12,
                        background: sol.flujo==='extendido'?'#fef3c7':'#dbeafe',
                        color: sol.flujo==='extendido'?'#b45309':'#1e40af'}}>
                        {sol.flujo==='extendido' ? 'Revisión' : 'Directo'}
                      </span>
                    </td>
                    <td style={{...s.td, textAlign:'center'}}>
                      <span style={{background:'#f5f6fa', border:'1px solid #e2e5ef', borderRadius:8,
                        padding:'2px 10px', fontSize:12, fontWeight:700, color:'#374151'}}>
                        {sol.posiciones_count ?? '—'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <EstadoBadge paso={sol.paso} flujo={sol.flujo} />
                    </td>
                    <td style={s.td}>
                      <button style={s.btnCrear} onClick={() => handleAbrir(sol)}>
                        Crear →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPLETADAS */}
      {completadas.length > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <h3 style={{...s.h2, fontSize:16}}>Códigos creados ({completadas.length})</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Ticket','Solicitante','Códigos SAP','Registrado por','Estado','Fecha'].map(h=>
                    <th key={h} style={s.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {completadas.map(sol => (
                  <tr key={sol.id} style={{opacity:.75}}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#16a34a', fontWeight:600}}>
                      {sol.ticket_id}
                    </td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={{...s.td, fontFamily:'monospace', fontSize:12, color:'#16a34a', fontWeight:600}}>
                      {sol.cantidad_codigos}
                    </td>
                    <td style={s.td}>{sol.atendido_por}</td>
                    <td style={s.td}>
                      <EstadoBadge paso={sol.paso} flujo={sol.flujo} />
                    </td>
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
        <div style={s.modalBg} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.mTitle}>Crear Códigos SAP</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            {/* Posiciones con input de código individual */}
            <div style={s.posicionesBox}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f1d3a', marginBottom:12}}>
                Posiciones ({selected.posiciones?.length || 0}) — un código por posición
              </div>

              {selected.posiciones?.map((pos, idx) => {
                const cod = codigosPosicion[pos.id] || '';
                const valido = validarCodigo(cod);
                return (
                  <div key={pos.id} style={{
                    ...s.posicionItem,
                    borderLeft: cod
                      ? valido ? '3px solid #16a34a' : '3px solid #dc2626'
                      : '3px solid #e2e5ef'
                  }}>
                    {/* Encabezado */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:11, fontWeight:700, color:'#6b7280'}}>
                          POSICIÓN {idx + 1}
                        </span>
                        {pos.categoria && (
                          <span style={{fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:8,
                            background:'#ede9fe', color:'#7c3aed'}}>
                            {pos.categoria}
                          </span>
                        )}
                      </div>
                      {cod && (
                        <span style={{fontSize:10, fontWeight:700,
                          color: valido ? '#16a34a' : '#dc2626',
                          background: valido ? '#dcfce7' : '#fef2f2',
                          padding:'2px 8px', borderRadius:10}}>
                          {valido ? '✓ Válido' : '✗ Formato incorrecto'}
                        </span>
                      )}
                    </div>

                    {/* Info del material */}
                    <div style={{marginBottom:8}}>
                      <div style={s.posLabel}>DENOMINACIÓN</div>
                      <div style={s.posValor}>{pos.denominacion}</div>
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
                      <div>
                        <div style={s.posLabel}>TIPO DE MATERIAL</div>
                        <div style={s.posValor}>{pos.tipo_material || '—'}</div>
                      </div>
                      <div>
                        <div style={s.posLabel}>GRUPO DE ARTÍCULOS</div>
                        <div style={s.posValor}>{pos.grupo_articulos || '—'}</div>
                      </div>
                    </div>

                    {/* Input código SAP */}
                    <div style={{paddingTop:10, borderTop:'1px dashed #e2e5ef'}}>
                      <label style={{display:'block', fontSize:11, fontWeight:700,
                        color:'#374151', marginBottom:6}}>
                        Código SAP <span style={{color:'#dc2626'}}>*</span>
                      </label>
                      <input
                        style={{
                          width:'100%', padding:'10px 13px', boxSizing:'border-box',
                          border: cod
                            ? `1.5px solid ${valido ? '#16a34a' : '#dc2626'}`
                            : '1.5px solid #e2e5ef',
                          borderRadius:8, fontSize:15, fontFamily:'monospace',
                          fontWeight:700, textAlign:'center', letterSpacing:3,
                          outline:'none', background: valido && cod ? '#f0fdf4' : '#fff',
                        }}
                        placeholder="XX-XXXXXXXX"
                        value={cod}
                        onChange={e => handleCambiarCodigo(pos.id, e.target.value)}
                        maxLength={11}
                      />
                      <span style={{fontSize:11, color:'#9ca3af', marginTop:4, display:'block'}}>
                        Formato: 02-00009999
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progreso */}
            <div style={{marginBottom:16, fontSize:12, color:'#6b7280', textAlign:'right'}}>
              {selected.posiciones?.filter(p => validarCodigo(codigosPosicion[p.id] || '')).length}
              /{selected.posiciones?.length} códigos completados
            </div>

            {error && <div style={{...s.errorBox, marginBottom:16}}>{error}</div>}

            <div style={{display:'flex', gap:10, justifyContent:'flex-end'}}>
              <button style={s.btnCancel} onClick={() => setSelected(null)}>Cancelar</button>
              <button
                style={{...s.btnConfirm, opacity: todasCompletas() ? 1 : 0.5}}
                onClick={handleRegistrar}
                disabled={!todasCompletas() || saving}>
                {saving ? 'Registrando…' : '✓ Registrar Códigos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:         { padding:28 },
  kpiGrid:      { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:24 },
  kpiCard:      { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:20 },
  kpiLabel:     { fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.7px', marginBottom:8 },
  kpiVal:       { fontSize:30, fontWeight:800, letterSpacing:'-1px' },
  card:         { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden', marginBottom:20 },
  header:       { padding:'20px 24px', borderBottom:'1px solid #e2e5ef' },
  h2:           { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:          { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:      { padding:48, textAlign:'center', color:'#9ca3af' },
  empty:        { padding:48, textAlign:'center', color:'#9ca3af' },
  table:        { width:'100%', borderCollapse:'collapse' },
  th:           { padding:'10px 14px', background:'#f5f6fa', fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px', textAlign:'left', borderBottom:'1px solid #e2e5ef', whiteSpace:'nowrap' },
  td:           { padding:'11px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #f0f2f8', verticalAlign:'middle' },
  btnCrear:     { padding:'5px 12px', background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  modalBg:      { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:        { background:'#fff', borderRadius:16, padding:32, maxWidth:560, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)', maxHeight:'90vh', overflow:'auto' },
  mTitle:       { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:         { fontSize:13, color:'#6b7280', marginBottom:16 },
  posicionesBox:{ background:'#f5f6fa', borderRadius:10, padding:14, marginBottom:12 },
  posicionItem: { background:'#fff', borderRadius:8, padding:14, marginBottom:10, border:'1px solid #e2e5ef' },
  posLabel:     { fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:3, letterSpacing:'.5px', textTransform:'uppercase' },
  posValor:     { fontSize:13, color:'#111827', fontWeight:500 },
  errorBox:     { background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#dc2626' },
  btnCancel:    { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnConfirm:   { padding:'10px 22px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
};
