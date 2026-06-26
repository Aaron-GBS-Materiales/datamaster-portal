// pages/Reportes.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, getPosicionesBySolicitud, getNombreUsuario } from '../services/supabase';
import * as XLSX from 'xlsx';

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
    + ' ' + d.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
}

function tiempoTotal(inicio, fin) {
  if (!inicio || !fin) return '—';
  const diff = new Date(fin) - new Date(inicio);
  const mins  = Math.floor(diff / 60000);
  const horas = Math.floor(mins / 60);
  const dias  = Math.floor(horas / 24);
  if (dias > 0)  return `${dias}d ${horas % 24}h ${mins % 60}m`;
  if (horas > 0) return `${horas}h ${mins % 60}m`;
  return `${mins}m`;
}

function getEstadoLabel(paso, flujo, estado) {
  if (estado === 'Rechazada') return 'Rechazada';
  if (flujo === 'directo') {
    if (paso >= 5) return 'Atendido';
    return 'Creación Pendiente';
  }
  switch (paso) {
    case 1:
    case 2:  return 'Revisión Pendiente';
    case 3:  return 'Liberación Pendiente';
    case 4:  return 'Creación Pendiente';
    default: return 'Atendido';
  }
}

export default function Reportes() {
  const [filas, setFilas]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const paso1 = await getSolicitudesPorPaso(1);
      const paso2 = await getSolicitudesPorPaso(2);
      const paso3 = await getSolicitudesPorPaso(3);
      const paso4 = await getSolicitudesPorPaso(4);
      const paso5 = await getSolicitudesPorPaso(5);
      const todas = [...paso1, ...paso2, ...paso3, ...paso4, ...paso5];

      // Cache de nombres de gestores
      const emailsGestores = new Set();
      todas.forEach(s => { if (s.asignado_a) emailsGestores.add(s.asignado_a); });
      const nombresCache = {};
      await Promise.all([...emailsGestores].map(async email => {
        nombresCache[email] = await getNombreUsuario(email);
      }));

      // Expandir por posiciones
      const resultado = [];
      for (const sol of todas) {
        const posiciones = await getPosicionesBySolicitud(sol.id);
        const gestorNombre = sol.asignado_a
          ? (nombresCache[sol.asignado_a] || sol.asignado_a.split('@')[0])
          : '—';

        if (posiciones.length === 0) {
          resultado.push({
            ticket:          sol.ticket_id,
            solicitante:     sol.nombre_solicitante,
            pais:            sol.pais,
            unidad_negocio:  sol.unidad_negocio,
            gestor:          gestorNombre,
            categoria:       '—',
            codigo:          '—',
            tipo_material:   '—',
            grupo_articulos: '—',
            denominacion:    '—',
            texto_pedido:    '—',
            fecha_solicitud: sol.fecha_recepcion,
            fecha_revision:  '—',
            fecha_liberacion:'—',
            fecha_creacion:  sol.fecha_respuesta || null,
            tiempo_total:    tiempoTotal(sol.fecha_recepcion, sol.fecha_respuesta),
            estado:          getEstadoLabel(sol.paso, sol.flujo, sol.estado),
            _esPrimeraPosicion: true,
            _totalPosiciones: 0,
          });
        } else {
          posiciones.forEach((pos, idx) => {
            const gestorPos = pos.asignado_gestor
              ? (nombresCache[pos.asignado_gestor] || pos.asignado_gestor.split('@')[0])
              : gestorNombre;

            resultado.push({
              ticket:           idx === 0 ? sol.ticket_id : '',
              solicitante:      idx === 0 ? sol.nombre_solicitante : '',
              pais:             idx === 0 ? sol.pais : '',
              unidad_negocio:   idx === 0 ? sol.unidad_negocio : '',
              gestor:           gestorPos,
              categoria:        pos.categoria || '—',
              codigo:           pos.codigo_sap || '—',
              tipo_material:    pos.tipo_material || '—',
              grupo_articulos:  pos.grupo_articulos || '—',
              denominacion:     pos.denominacion || '—',
              texto_pedido:     pos.texto_pedido || '—',
              fecha_solicitud:  idx === 0 ? sol.fecha_recepcion : null,
              fecha_revision:   pos.updated_at || null,
              fecha_liberacion: pos.fecha_liberacion || null,
              fecha_creacion:   idx === 0 ? (sol.fecha_respuesta || null) : null,
              tiempo_total:     idx === 0 ? tiempoTotal(sol.fecha_recepcion, sol.fecha_respuesta) : '',
              estado:           getEstadoLabel(sol.paso, sol.flujo, pos.estado || sol.estado),
              _esPrimeraPosicion: idx === 0,
              _totalPosiciones: posiciones.length,
              _solicitudId: sol.id,
            });
          });
        }
      }

      setFilas(resultado);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }

  // ── Filtros ──
  const filasFiltradas = filas.filter(f => {
    const ticket = f.ticket || filas.find(x => x._solicitudId === f._solicitudId && x.ticket)?.ticket || '';
    const textoMatch = !filtro || [
      ticket, f.solicitante, f.denominacion, f.categoria, f.codigo
    ].some(v => v?.toLowerCase().includes(filtro.toLowerCase()));
    const estadoMatch = !filtroEstado || f.estado === filtroEstado;
    const unidadMatch = !filtroUnidad || f.unidad_negocio === filtroUnidad;
    return textoMatch && estadoMatch && unidadMatch;
  });

  const estados  = [...new Set(filas.map(f => f.estado).filter(Boolean))];
  const unidades = [...new Set(filas.map(f => f.unidad_negocio).filter(v => v && v !== ''))];

  // ── Exportar Excel ──
  function exportarExcel() {
    const encabezados = [
      'TICKET', 'SOLICITANTE', 'PAÍS', 'UNIDAD DE NEGOCIO', 'GESTOR',
      'CATEGORÍA DE MATERIAL', 'CÓDIGO SAP', 'TIPO DE MATERIAL',
      'GRUPO DE ARTÍCULOS', 'DENOMINACIÓN', 'TEXTO DE PEDIDO',
      'FECHA Y HORA DE SOLICITUD', 'FECHA Y HORA DE REVISIÓN',
      'FECHA Y HORA DE LIBERACIÓN', 'FECHA Y HORA DE CREACIÓN',
      'TIEMPO TOTAL', 'ESTADO',
    ];

    // Para Excel sí mostramos el ticket en cada fila
    let ticketActual = '';
    let solicitanteActual = '';
    let paisActual = '';
    let unidadActual = '';
    let fechaSolicitudActual = '';
    let tiempoTotalActual = '';

    const datos = filasFiltradas.map(f => {
      if (f.ticket) {
        ticketActual        = f.ticket;
        solicitanteActual   = f.solicitante;
        paisActual          = f.pais;
        unidadActual        = f.unidad_negocio;
        fechaSolicitudActual = formatFecha(f.fecha_solicitud);
        tiempoTotalActual   = f.tiempo_total;
      }
      return [
        ticketActual,
        solicitanteActual,
        paisActual,
        unidadActual,
        f.gestor,
        f.categoria,
        f.codigo,
        f.tipo_material,
        f.grupo_articulos,
        f.denominacion,
        f.texto_pedido,
        fechaSolicitudActual,
        formatFecha(f.fecha_revision),
        formatFecha(f.fecha_liberacion),
        formatFecha(f.fecha_creacion),
        tiempoTotalActual,
        f.estado,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([encabezados, ...datos]);

    // Ancho de columnas
    ws['!cols'] = [
      {wch:16},{wch:22},{wch:10},{wch:18},{wch:22},
      {wch:20},{wch:14},{wch:20},{wch:22},{wch:25},
      {wch:30},{wch:20},{wch:20},{wch:20},{wch:20},
      {wch:14},{wch:20},
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `Reporte_DataMaster_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const COLS = [
    'Ticket', 'Solicitante', 'País', 'Unidad de Negocio', 'Gestor',
    'Categoría', 'Código SAP', 'Tipo de Material', 'Grupo de Artículos',
    'Denominación', 'Texto de Pedido', 'Fecha Solicitud',
    'Fecha Revisión', 'Fecha Liberación', 'Fecha Creación',
    'Tiempo Total', 'Estado',
  ];

  const estadoColor = {
    'Atendido':            { color:'#16a34a', bg:'#dcfce7' },
    'Creación Pendiente':  { color:'#7c3aed', bg:'#ede9fe' },
    'Liberación Pendiente':{ color:'#1d4ed8', bg:'#dbeafe' },
    'Revisión Pendiente':  { color:'#b45309', bg:'#fef9c3' },
    'Rechazada':           { color:'#dc2626', bg:'#fef2f2' },
  };

  return (
    <div style={{padding:28}}>

      {/* ── Encabezado ── */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
        <div>
          <h2 style={{fontSize:20, fontWeight:800, color:'#0f1d3a', margin:0}}>Reporte General</h2>
          <p style={{fontSize:12, color:'#6b7280', marginTop:3}}>
            {filasFiltradas.length} registros · Todas las solicitudes y posiciones procesadas
          </p>
        </div>
        <button
          style={{padding:'10px 20px', background:'#16a34a', color:'#fff', border:'none',
            borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer',
            display:'flex', alignItems:'center', gap:8}}
          onClick={exportarExcel}
          disabled={loading || filasFiltradas.length === 0}>
          📥 Descargar Excel
        </button>
      </div>

      {/* ── Filtros ── */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16}}>
        <input
          style={{padding:'9px 13px', border:'1.5px solid #e2e5ef', borderRadius:8,
            fontSize:13, outline:'none', background:'#fff'}}
          placeholder="🔍 Buscar ticket, solicitante, denominación…"
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
        />
        <select
          style={{padding:'9px 13px', border:'1.5px solid #e2e5ef', borderRadius:8,
            fontSize:13, outline:'none', background:'#fff'}}
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {estados.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          style={{padding:'9px 13px', border:'1.5px solid #e2e5ef', borderRadius:8,
            fontSize:13, outline:'none', background:'#fff'}}
          value={filtroUnidad}
          onChange={e => setFiltroUnidad(e.target.value)}>
          <option value="">Todas las unidades</option>
          {unidades.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* ── Tabla ── */}
      <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, overflow:'hidden'}}>
        {loading ? (
          <div style={{padding:48, textAlign:'center', color:'#9ca3af'}}>Cargando reporte…</div>
        ) : filasFiltradas.length === 0 ? (
          <div style={{padding:48, textAlign:'center', color:'#9ca3af'}}>Sin resultados</div>
        ) : (
          <div style={{overflowX:'auto', maxHeight:'65vh', overflowY:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead style={{position:'sticky', top:0, zIndex:10}}>
                <tr>
                  {COLS.map(h => (
                    <th key={h} style={{
                      padding:'9px 10px', background:'#f5f6fa', fontSize:10, fontWeight:700,
                      color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px',
                      textAlign:'left', borderBottom:'1px solid #e2e5ef',
                      whiteSpace:'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map((f, idx) => {
                  const esNuevoTicket = f._esPrimeraPosicion || f.ticket;
                  const ec = estadoColor[f.estado] || { color:'#6b7280', bg:'#f5f6fa' };
                  return (
                    <tr key={idx} style={{
                      background: esNuevoTicket && idx > 0 ? '#fafbff' : '#fff',
                      borderTop: esNuevoTicket && idx > 0 ? '2px solid #e2e5ef' : 'none',
                    }}>
                      {/* Ticket — solo primera posición */}
                      <td style={{padding:'9px 10px', fontSize:12, fontFamily:'monospace',
                        color:'#2563eb', fontWeight:700, whiteSpace:'nowrap',
                        borderBottom:'1px solid #f0f2f8'}}>
                        {f.ticket}
                      </td>
                      <td style={td}>{f.solicitante}</td>
                      <td style={td}>{f.pais}</td>
                      <td style={{...td, fontSize:11}}>
                        {f.unidad_negocio
                          ? <span style={{background:'#eff4ff', color:'#2563eb', padding:'2px 6px', borderRadius:6, fontWeight:600, fontSize:10}}>
                              {f.unidad_negocio}
                            </span>
                          : ''}
                      </td>
                      <td style={{...td, fontSize:11}}>{f.gestor}</td>
                      <td style={{...td, fontSize:11}}>
                        {f.categoria !== '—'
                          ? <span style={{background:'#ede9fe', color:'#7c3aed', padding:'2px 6px', borderRadius:6, fontWeight:600, fontSize:10}}>
                              {f.categoria}
                            </span>
                          : '—'}
                      </td>
                      <td style={{...td, fontFamily:'monospace', fontSize:11, color:'#16a34a', fontWeight:600}}>
                        {f.codigo}
                      </td>
                      <td style={{...td, fontSize:11}}>{f.tipo_material}</td>
                      <td style={{...td, fontSize:11}}>{f.grupo_articulos}</td>
                      <td style={{...td, fontSize:11, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
                        title={f.denominacion}>
                        {f.denominacion}
                      </td>
                      <td style={{...td, fontSize:11, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
                        title={f.texto_pedido}>
                        {f.texto_pedido}
                      </td>
                      <td style={{...td, fontSize:11, whiteSpace:'nowrap', color:'#374151'}}>
                        {f.fecha_solicitud ? formatFecha(f.fecha_solicitud) : ''}
                      </td>
                      <td style={{...td, fontSize:11, whiteSpace:'nowrap', color:'#374151'}}>
                        {formatFecha(f.fecha_revision)}
                      </td>
                      <td style={{...td, fontSize:11, whiteSpace:'nowrap', color:'#16a34a', fontWeight: f.fecha_liberacion ? 600 : 400}}>
                        {f.fecha_liberacion ? '✓ ' + formatFecha(f.fecha_liberacion) : '—'}
                      </td>
                      <td style={{...td, fontSize:11, whiteSpace:'nowrap', color:'#374151'}}>
                        {f.fecha_creacion ? formatFecha(f.fecha_creacion) : ''}
                      </td>
                      <td style={{...td, fontSize:11, whiteSpace:'nowrap', fontWeight:600}}>
                        {f.tiempo_total}
                      </td>
                      <td style={{padding:'9px 10px', borderBottom:'1px solid #f0f2f8'}}>
                        {f.estado && (
                          <span style={{fontSize:10, fontWeight:700, padding:'2px 7px',
                            borderRadius:10, background: ec.bg, color: ec.color, whiteSpace:'nowrap'}}>
                            {f.estado}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const td = {
  padding:'9px 10px', fontSize:12, color:'#374151',
  borderBottom:'1px solid #f0f2f8', verticalAlign:'middle',
};
