// pages/LiderCategoria.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, avanzarPaso, rechazarSolicitud,
         getPosicionesBySolicitud, actualizarPosicion, getNombreUsuario,
         todasPosicionesAprobadas } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { EstadoBadge } from '../utils/estadoHelper';

const FLAG = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
    + ' ' + d.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
}

function tiempoTranscurrido(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const horas = Math.floor(mins / 60);
  const dias  = Math.floor(horas / 24);
  if (dias > 0)  return `${dias}d ${horas % 24}h`;
  if (horas > 0) return `${horas}h ${mins % 60}m`;
  return `${mins}m`;
}

function colorTiempo(iso) {
  if (!iso) return '#6b7280';
  const horas = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (horas > 48) return '#dc2626';
  if (horas > 24) return '#f59e0b';
  return '#16a34a';
}

function bgTiempo(iso) {
  const c = colorTiempo(iso);
  if (c === '#dc2626') return '#fef2f2';
  if (c === '#f59e0b') return '#fffbeb';
  return '#dcfce7';
}

// Encabezado de tabla con soporte para doble renglón
function Th({ children }) {
  return (
    <th style={{
      padding:'8px 10px', background:'#f5f6fa', fontSize:10, fontWeight:600,
      color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px',
      textAlign:'left', borderBottom:'1px solid #e2e5ef',
      whiteSpace:'normal', lineHeight:1.3, minWidth:60, maxWidth:120,
    }}>
      {children}
    </th>
  );
}

export default function LiderCategoria() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [nombresGestores, setNombresGestores] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formPosiciones, setFormPosiciones] = useState({});
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  // Nombre con género para el saludo
  const nombreUsuario = user?.nombre?.split(' ')[0] || '';

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const paso3 = await getSolicitudesPorPaso(3);
      const paso4 = await getSolicitudesPorPaso(4);
      const paso5 = await getSolicitudesPorPaso(5);
      let todas = [...paso3, ...paso4, ...paso5];

      const categoriasLider = user?.categorias;
      if (categoriasLider && categoriasLider.length > 0) {
        const dataFiltrada = await Promise.all(
          todas.map(async sol => {
            const pos = await getPosicionesBySolicitud(sol.id);
            const misPosiciones = pos.filter(p => categoriasLider.includes(p.categoria));
            if (misPosiciones.length === 0) return null;
            return { ...sol, _misPosiciones: misPosiciones };
          })
        );
        todas = dataFiltrada.filter(Boolean);
      }

      setSolicitudes(todas);

      const emailsGestores = new Set();
      todas.forEach(sol => {
        (sol._misPosiciones || []).forEach(p => {
          if (p.asignado_gestor) emailsGestores.add(p.asignado_gestor);
        });
      });

      const nombres = {};
      await Promise.all([...emailsGestores].map(async email => {
        nombres[email] = await getNombreUsuario(email);
      }));
      setNombresGestores(nombres);
    } catch {}
    setLoading(false);
  }

  async function handleRevisar(sol) {
    const todasPos = await getPosicionesBySolicitud(sol.id);
    const categoriasLider = user?.categorias || [];
    const posFiltradas = categoriasLider.length > 0
      ? todasPos.filter(p => categoriasLider.includes(p.categoria))
      : todasPos;

    setSelected({...sol, posiciones: posFiltradas});

    const initForm = {};
    posFiltradas.forEach(p => {
      initForm[p.id] = {
        rechazada:      p.estado === 'Rechazada',
        motivoRechazo:  '',
        mostrarRechazo: false,
      };
    });
    setFormPosiciones(initForm);
  }

  function handleChangePos(posId, field, value) {
    setFormPosiciones(prev => ({
      ...prev,
      [posId]: { ...prev[posId], [field]: value }
    }));
  }

  const posicionesAprobables = () =>
    selected?.posiciones?.filter(p => !formPosiciones[p.id]?.rechazada) || [];

  const hayAlgoAprobable = () => posicionesAprobables().length > 0;

  async function handleRechazarPosicion(posId) {
    const motivo = formPosiciones[posId]?.motivoRechazo;
    if (!motivo) return;
    setSaving(true);
    try {
      await actualizarPosicion(posId, { estado: 'Rechazada', motivo_rechazo: motivo });
      setFormPosiciones(prev => ({
        ...prev,
        [posId]: { ...prev[posId], rechazada: true, mostrarRechazo: false }
      }));
      setSelected(prev => ({
        ...prev,
        posiciones: prev.posiciones.map(p =>
          p.id === posId ? {...p, estado: 'Rechazada'} : p
        )
      }));
    } catch (err) {
      console.error('Error al rechazar posición:', err);
      alert('Error: ' + (err?.message || JSON.stringify(err)));
    }
    setSaving(false);
  }

  async function handleAprobarTodo() {
    if (!hayAlgoAprobable()) return;
    setSaving(true);
    try {
      await Promise.all(
        posicionesAprobables().map(p =>
          actualizarPosicion(p.id, {
            estado:            'Aprobada',
            estado_lider:      'Aprobada',
            fecha_liberacion:  new Date().toISOString(),
          })
        )
      );
      const todasListas = await todasPosicionesAprobadas(selected.id);
      if (todasListas) {
        await avanzarPaso(selected.id, 4, {
          aprobado_por_lider: true,
          estado: 'Aprobada',
        });
      }
      setSelected(null);
      setFormPosiciones({});
      load();
    } catch {}
    setSaving(false);
  }

  async function handleRechazarTodo() {
    setSaving(true);
    try {
      await rechazarSolicitud(selected.id, 'Solicitud rechazada por Líder de Categoría');
      setSelected(null);
      setFormPosiciones({});
      load();
    } catch {}
    setSaving(false);
  }

  function gestorDeMisPosiciones(sol) {
    const misPosiciones = sol._misPosiciones || [];
    const emailGestor = misPosiciones.find(p => p.asignado_gestor)?.asignado_gestor;
    if (!emailGestor) return null;
    return nombresGestores[emailGestor] || emailGestor.split('@')[0];
  }

  function fechaLiberacion(sol) {
    const misPosiciones = sol._misPosiciones || [];
    const pos = misPosiciones.find(p => p.fecha_liberacion);
    return pos?.fecha_liberacion || null;
  }

  const pendientes = solicitudes.filter(s => {
    if (s.paso !== 3) return false;
    const misPosiciones = s._misPosiciones || [];
    return misPosiciones.some(p => p.estado_lider !== 'Aprobada');
  });

  const procesadas = solicitudes.filter(s => {
    if (s.paso > 3) return true;
    const misPosiciones = s._misPosiciones || [];
    return misPosiciones.length > 0 && misPosiciones.every(p => p.estado_lider === 'Aprobada');
  });

  const posRechazadas = selected ? Object.values(formPosiciones).filter(f => f.rechazada).length : 0;
  const posAprobables = selected ? posicionesAprobables().length : 0;

  // Componente avatar gestor
  const AvatarGestor = ({ sol }) => {
    const nombre = gestorDeMisPosiciones(sol);
    if (!nombre) return <span style={{color:'#9ca3af', fontSize:12}}>—</span>;
    return (
      <span style={{display:'flex', alignItems:'center', gap:6}}>
        <span style={{width:24, height:24, borderRadius:'50%', background:'#e0e7ff',
          color:'#4f46e5', fontSize:10, fontWeight:700, flexShrink:0,
          display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span style={{fontSize:12, color:'#374151', fontWeight:500}}>{nombre}</span>
      </span>
    );
  };

  return (
    <div style={s.wrap}>

      {/* ── SALUDO ── */}
      <div style={s.saludo}>
        <span style={s.saludoTexto}>
          Hola <strong>{nombreUsuario}</strong>, bienvenida/o al Portal Data Master
        </span>
        <span style={{fontSize:12, color:'#9ca3af'}}>
          {pendientes.length} solicitud(es) pendiente(s) de liberar
        </span>
      </div>

      {/* ── PENDIENTES ── */}
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Pendientes de aprobar</h2>
            <p style={s.sub}>Aprueba o rechaza las posiciones de tus categorías</p>
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
                  <Th>Ticket</Th>
                  <Th>Solicitante</Th>
                  <Th>Unidad de<br/>Negocio</Th>
                  <Th>País</Th>
                  <Th>Gestor<br/>Asignado</Th>
                  <Th>Pos.</Th>
                  <Th>Fecha y Hora<br/>de Solicitud</Th>
                  <Th>Tiempo</Th>
                  <Th>Tiempo sin<br/>Liberación</Th>
                  <Th>Estado</Th>
                  <Th>Acción</Th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map(sol => (
                  <tr key={sol.id}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600, whiteSpace:'nowrap'}}>
                      {sol.ticket_id}
                    </td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>
                      <span style={{background:'#eff4ff', color:'#2563eb', padding:'2px 6px', borderRadius:8, fontWeight:600, fontSize:11}}>
                        {sol.unidad_negocio || '—'}
                      </span>
                    </td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}><AvatarGestor sol={sol} /></td>
                    <td style={{...s.td, textAlign:'center'}}>
                      <span style={{background:'#f5f6fa', border:'1px solid #e2e5ef', borderRadius:8,
                        padding:'2px 8px', fontSize:12, fontWeight:700, color:'#374151'}}>
                        {(sol._misPosiciones || []).length}
                      </span>
                    </td>
                    <td style={{...s.td, fontSize:11, color:'#374151', whiteSpace:'nowrap'}}>
                      {formatFecha(sol.fecha_recepcion)}
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>
                      <span style={{fontSize:11, fontWeight:700,
                        color: colorTiempo(sol.fecha_recepcion),
                        background: bgTiempo(sol.fecha_recepcion),
                        padding:'2px 8px', borderRadius:10}}>
                        ⏱ {tiempoTranscurrido(sol.fecha_recepcion)}
                      </span>
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>
                      <span style={{fontSize:11, fontWeight:700,
                        color: colorTiempo(sol.fecha_asignado_lider || sol.fecha_recepcion),
                        background: bgTiempo(sol.fecha_asignado_lider || sol.fecha_recepcion),
                        padding:'2px 8px', borderRadius:10}}>
                        🔒 {tiempoTranscurrido(sol.fecha_asignado_lider || sol.fecha_recepcion)}
                      </span>
                    </td>
                    <td style={s.td}>
                      <EstadoBadge paso={sol.paso} flujo={sol.flujo} />
                    </td>
                    <td style={s.td}>
                      <button style={s.btnRevisar} onClick={() => handleRevisar(sol)}>Revisar →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── HISTORIAL ── */}
      {procesadas.length > 0 && (
        <div style={s.card}>
          <div style={s.header}>
            <h3 style={{...s.h2, fontSize:16}}>Historial ({procesadas.length})</h3>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={s.table}>
              <thead>
                <tr>
                  <Th>Ticket</Th>
                  <Th>Solicitante</Th>
                  <Th>Unidad de<br/>Negocio</Th>
                  <Th>País</Th>
                  <Th>Gestor<br/>Asignado</Th>
                  <Th>Pos.</Th>
                  <Th>Fecha y Hora<br/>de Solicitud</Th>
                  <Th>Tiempo</Th>
                  <Th>Tiempo sin<br/>Liberación</Th>
                  <Th>Fecha y Hora<br/>de Liberación</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {procesadas.map(sol => (
                  <tr key={sol.id} style={{opacity:.85}}>
                    <td style={{...s.td, fontFamily:'monospace', color:'#2563eb', fontWeight:600}}>
                      {sol.ticket_id}
                    </td>
                    <td style={s.td}>{sol.nombre_solicitante}</td>
                    <td style={s.td}>
                      <span style={{background:'#f5f6fa', color:'#374151', padding:'2px 6px', borderRadius:8, fontSize:11}}>
                        {sol.unidad_negocio || '—'}
                      </span>
                    </td>
                    <td style={s.td}>{FLAG[sol.pais]||''} {sol.pais}</td>
                    <td style={s.td}><AvatarGestor sol={sol} /></td>
                    <td style={{...s.td, textAlign:'center'}}>
                      <span style={{background:'#f5f6fa', border:'1px solid #e2e5ef', borderRadius:8,
                        padding:'2px 8px', fontSize:12, fontWeight:700, color:'#374151'}}>
                        {(sol._misPosiciones || []).length}
                      </span>
                    </td>
                    <td style={{...s.td, fontSize:11, color:'#374151', whiteSpace:'nowrap'}}>
                      {formatFecha(sol.fecha_recepcion)}
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>
                      <span style={{fontSize:11, fontWeight:700,
                        color: colorTiempo(sol.fecha_recepcion),
                        background: bgTiempo(sol.fecha_recepcion),
                        padding:'2px 8px', borderRadius:10}}>
                        ⏱ {tiempoTranscurrido(sol.fecha_recepcion)}
                      </span>
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>
                      {sol.fecha_asignado_lider ? (
                        <span style={{fontSize:11, fontWeight:700,
                          color: colorTiempo(sol.fecha_asignado_lider),
                          background: bgTiempo(sol.fecha_asignado_lider),
                          padding:'2px 8px', borderRadius:10}}>
                          🔒 {tiempoTranscurrido(sol.fecha_asignado_lider)}
                        </span>
                      ) : <span style={{color:'#9ca3af', fontSize:11}}>—</span>}
                    </td>
                    <td style={{...s.td, fontSize:11, color:'#16a34a', fontWeight:600, whiteSpace:'nowrap'}}>
                      {formatFecha(fechaLiberacion(sol)) !== '—'
                        ? <span style={{color:'#16a34a'}}>✓ {formatFecha(fechaLiberacion(sol))}</span>
                        : <span style={{color:'#9ca3af'}}>—</span>
                      }
                    </td>
                    <td style={s.td}>
                      <EstadoBadge paso={sol.paso} flujo={sol.flujo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {selected && (
        <div style={s.modalBg} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.mTitle}>Revisar Solicitud</h3>
            <p style={s.mSub}>{selected.ticket_id} · {selected.nombre_solicitante}</p>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16}}>
              <div style={s.infoChip}>
                <div style={s.infoChipLabel}>UNIDAD DE NEGOCIO</div>
                <div style={s.infoChipVal}>{selected.unidad_negocio || '—'}</div>
              </div>
              <div style={s.infoChip}>
                <div style={s.infoChipLabel}>GESTOR</div>
                <div style={s.infoChipVal}>
                  {selected.posiciones?.find(p => p.asignado_gestor)?.asignado_gestor
                    ? (nombresGestores[selected.posiciones.find(p => p.asignado_gestor).asignado_gestor] ||
                       selected.posiciones.find(p => p.asignado_gestor).asignado_gestor.split('@')[0])
                    : '—'}
                </div>
              </div>
              <div style={s.infoChip}>
                <div style={s.infoChipLabel}>TIEMPO SIN LIBERAR</div>
                <div style={{...s.infoChipVal,
                  color: colorTiempo(selected.fecha_asignado_lider || selected.fecha_recepcion), fontWeight:700}}>
                  🔒 {tiempoTranscurrido(selected.fecha_asignado_lider || selected.fecha_recepcion)}
                </div>
              </div>
            </div>

            {user?.categorias?.length > 0 && (
              <div style={{background:'#eff4ff', border:'1px solid #bfdbfe', borderRadius:8,
                padding:'8px 12px', fontSize:12, color:'#2563eb', marginBottom:16}}>
                📋 Mostrando solo las posiciones de tus categorías:
                <strong> {user.categorias.join(', ')}</strong>
              </div>
            )}

            {selected.posiciones?.length > 1 && (
              <div style={s.resumenBar}>
                <span style={{color:'#16a34a', fontWeight:600}}>{posAprobables} aprobables</span>
                {posRechazadas > 0 && <>
                  <span style={{color:'#6b7280', margin:'0 8px'}}>·</span>
                  <span style={{color:'#dc2626', fontWeight:600}}>{posRechazadas} rechazadas</span>
                </>}
                <span style={{color:'#6b7280', marginLeft:'auto', fontSize:11}}>
                  {selected.posiciones.length} posiciones asignadas a ti
                </span>
              </div>
            )}

            <div style={s.posicionesBox}>
              <div style={{fontSize:12, fontWeight:700, color:'#0f1d3a', marginBottom:12}}>
                Posiciones asignadas ({selected.posiciones?.length || 0})
              </div>

              {selected.posiciones && selected.posiciones.map((pos, idx) => {
                const posForm   = formPosiciones[pos.id] || {};
                const rechazada = posForm.rechazada;

                return (
                  <div key={pos.id} style={{
                    ...s.posicionItem,
                    borderLeft: rechazada ? '3px solid #dc2626' : '3px solid #16a34a',
                    opacity: rechazada ? 0.6 : 1,
                  }}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:11, fontWeight:700, color:'#6b7280', letterSpacing:'.5px'}}>
                          POSICIÓN {idx + 1}
                        </span>
                        {pos.categoria && (
                          <span style={{fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:8,
                            background:'#ede9fe', color:'#7c3aed'}}>
                            {pos.categoria}
                          </span>
                        )}
                      </div>
                      {rechazada ? (
                        <span style={{fontSize:10, fontWeight:700, color:'#dc2626', background:'#fef2f2', padding:'2px 8px', borderRadius:10}}>✗ Rechazada</span>
                      ) : (
                        <span style={{fontSize:10, fontWeight:700, color:'#16a34a', background:'#dcfce7', padding:'2px 8px', borderRadius:10}}>✓ Aprobable</span>
                      )}
                    </div>

                    <div style={{marginBottom:8}}>
                      <div style={s.posLabel}>DENOMINACIÓN</div>
                      <div style={s.posValor}>{pos.denominacion}</div>
                    </div>
                    <div style={{marginBottom:8}}>
                      <div style={s.posLabel}>UNIDAD DE MEDIDA</div>
                      <div style={s.posValor}>{pos.unidad_medida}</div>
                    </div>
                    {pos.texto_pedido && (
                      <div style={{marginBottom:10}}>
                        <div style={s.posLabel}>TEXTO DE PEDIDO</div>
                        <div style={{...s.posValor, color:'#6b7280', whiteSpace:'pre-wrap', maxHeight:50, overflow:'auto'}}>
                          {pos.texto_pedido}
                        </div>
                      </div>
                    )}

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10,
                      paddingTop:10, borderTop:'1px dashed #e2e5ef', marginBottom: rechazada ? 0 : 10}}>
                      <div>
                        <div style={s.posLabel}>TIPO DE MATERIAL</div>
                        <div style={{fontSize:13, fontWeight:600, color: pos.tipo_material ? '#0f1d3a' : '#9ca3af'}}>
                          {pos.tipo_material || '—'}
                        </div>
                      </div>
                      <div>
                        <div style={s.posLabel}>GRUPO DE ARTÍCULOS</div>
                        <div style={{fontSize:13, fontWeight:600, color: pos.grupo_articulos ? '#0f1d3a' : '#9ca3af'}}>
                          {pos.grupo_articulos || '—'}
                        </div>
                      </div>
                    </div>

                    {!rechazada && (
                      !posForm.mostrarRechazo ? (
                        <button style={s.btnRechazarPos}
                          onClick={() => handleChangePos(pos.id, 'mostrarRechazo', true)}>
                          ✗ Rechazar esta posición
                        </button>
                      ) : (
                        <div style={{marginTop:8, background:'#fef2f2', borderRadius:8, padding:10}}>
                          <div style={{fontSize:11, fontWeight:600, color:'#dc2626', marginBottom:6}}>Motivo del rechazo</div>
                          <textarea
                            style={{...s.input, minHeight:60, resize:'vertical', fontSize:12, marginBottom:8}}
                            placeholder="Indica el motivo…"
                            value={posForm.motivoRechazo || ''}
                            onChange={e => handleChangePos(pos.id, 'motivoRechazo', e.target.value)}
                          />
                          <div style={{display:'flex', gap:8}}>
                            <button style={{...s.btnRechazarPos, flex:1}}
                              onClick={() => handleChangePos(pos.id, 'mostrarRechazo', false)}>
                              Cancelar
                            </button>
                            <button
                              style={{...s.btnRechazarPos, flex:1, background:'#dc2626', color:'#fff', border:'none',
                                opacity: posForm.motivoRechazo ? 1 : 0.5}}
                              disabled={!posForm.motivoRechazo || saving}
                              onClick={() => handleRechazarPosicion(pos.id)}>
                              Confirmar rechazo
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap'}}>
              <button style={s.btnCancel} onClick={() => setSelected(null)}>Cancelar</button>
              <button style={s.btnReject} onClick={handleRechazarTodo} disabled={saving}>✗ Rechazar todo</button>
              <button
                style={{...s.btnApprove, opacity: hayAlgoAprobable() ? 1 : 0.5}}
                onClick={handleAprobarTodo}
                disabled={!hayAlgoAprobable() || saving}>
                {saving ? 'Procesando…' : posRechazadas > 0
                  ? `✓ Aprobar ${posAprobables} posición(es)`
                  : '✓ Aprobar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:          { padding:28 },
  saludo:        { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:'16px 24px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' },
  saludoTexto:   { fontSize:16, color:'#0f1d3a' },
  card:          { background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden', marginBottom:20 },
  header:        { padding:'20px 24px', borderBottom:'1px solid #e2e5ef', display:'flex', alignItems:'center', justifyContent:'space-between' },
  h2:            { fontSize:18, fontWeight:800, color:'#0f1d3a', margin:0 },
  sub:           { fontSize:12, color:'#6b7280', marginTop:3 },
  loading:       { padding:48, textAlign:'center', color:'#9ca3af' },
  empty:         { padding:48, textAlign:'center', color:'#9ca3af' },
  table:         { width:'100%', borderCollapse:'collapse' },
  td:            { padding:'10px 10px', fontSize:12, color:'#374151', borderBottom:'1px solid #f0f2f8', verticalAlign:'middle' },
  btnRevisar:    { padding:'5px 10px', background:'#eff4ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' },
  modalBg:       { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:24 },
  modal:         { background:'#fff', borderRadius:16, padding:32, maxWidth:600, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.2)', maxHeight:'90vh', overflow:'auto' },
  mTitle:        { fontSize:18, fontWeight:800, color:'#0f1d3a', marginBottom:4 },
  mSub:          { fontSize:13, color:'#6b7280', marginBottom:16 },
  infoChip:      { background:'#f5f6fa', borderRadius:8, padding:'8px 12px' },
  infoChipLabel: { fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:3, letterSpacing:'.5px', textTransform:'uppercase' },
  infoChipVal:   { fontSize:12, fontWeight:600, color:'#0f1d3a' },
  resumenBar:    { display:'flex', alignItems:'center', background:'#f5f6fa', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:12 },
  posicionesBox: { background:'#f5f6fa', borderRadius:10, padding:14, marginBottom:16 },
  posicionItem:  { background:'#fff', borderRadius:8, padding:14, marginBottom:10, border:'1px solid #e2e5ef' },
  posLabel:      { fontSize:10, fontWeight:600, color:'#9ca3af', marginBottom:3, letterSpacing:'.5px', textTransform:'uppercase' },
  posValor:      { fontSize:13, color:'#111827' },
  label:         { display:'block', fontSize:12, fontWeight:600, color:'#374151' },
  input:         { width:'100%', padding:'10px 13px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' },
  btnCancel:     { padding:'10px 18px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnReject:     { padding:'10px 18px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnApprove:    { padding:'10px 22px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer' },
  btnRechazarPos:{ padding:'6px 12px', background:'#fff', color:'#dc2626', border:'1px solid #fecaca', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', width:'100%' },
};
