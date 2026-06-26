// pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { getSolicitudesPorPaso, getPosicionesBySolicitud } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin  = user?.rol === 'ADMINISTRADOR' || user?.rol === 'DATA MASTER';
  const isGestor = user?.rol === 'GESTOR DE INVENTARIO';
  const isLider  = user?.rol === 'LIDER DE CATEGORÍA';

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const paso1 = await getSolicitudesPorPaso(1);
      const paso2 = await getSolicitudesPorPaso(2);
      const paso3 = await getSolicitudesPorPaso(3);
      const paso4 = await getSolicitudesPorPaso(4);
      const paso5 = await getSolicitudesPorPaso(5);
      setSolicitudes([...paso1, ...paso2, ...paso3, ...paso4, ...paso5]);
    } catch {}
    setLoading(false);
  }

  if (loading) return (
    <div style={{padding:48, textAlign:'center', color:'#9ca3af'}}>Cargando dashboard…</div>
  );

  // ── Métricas generales ──
  const total      = solicitudes.length;
  const enProceso  = solicitudes.filter(s => s.paso < 5 && s.estado !== 'Rechazada').length;
  const atendidas  = solicitudes.filter(s => s.paso === 5).length;
  const rechazadas = solicitudes.filter(s => s.estado === 'Rechazada').length;
  const tasaExito  = total > 0 ? Math.round((atendidas / total) * 100) : 0;

  // ── Por paso ──
  const porPaso = [
    { label: 'Revisión\nGestor',   paso: 2, count: solicitudes.filter(s => s.paso === 2).length, color: '#f59e0b', bg: '#fef9c3' },
    { label: 'Revisión\nLíder',    paso: 3, count: solicitudes.filter(s => s.paso === 3).length, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Creación\nPendiente',paso: 4, count: solicitudes.filter(s => s.paso === 4).length, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Atendidas',          paso: 5, count: solicitudes.filter(s => s.paso === 5).length, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Rechazadas',         paso: 0, count: rechazadas,                                    color: '#dc2626', bg: '#fef2f2' },
  ];
  const maxPaso = Math.max(...porPaso.map(p => p.count), 1);

  // ── Por país ──
  const paises = {};
  solicitudes.forEach(s => { paises[s.pais] = (paises[s.pais] || 0) + 1; });
  const porPais = Object.entries(paises).sort((a,b) => b[1]-a[1]);
  const maxPais = Math.max(...porPais.map(p => p[1]), 1);
  const flagMap = { Perú:'🇵🇪', Colombia:'🇨🇴', Chile:'🇨🇱', Ecuador:'🇪🇨', Bolivia:'🇧🇴' };

  // ── Por unidad de negocio ──
  const unidades = {};
  solicitudes.forEach(s => {
    if (s.unidad_negocio) unidades[s.unidad_negocio] = (unidades[s.unidad_negocio] || 0) + 1;
  });
  const porUnidad = Object.entries(unidades).sort((a,b) => b[1]-a[1]).slice(0, 6);

  // ── Tendencia últimos 7 días ──
  const hoy = new Date();
  const dias7 = Array.from({length: 7}, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString('es-PE', { weekday:'short', day:'2-digit' }),
      fecha: d.toISOString().split('T')[0],
      count: 0,
    };
  });
  solicitudes.forEach(s => {
    const fecha = s.fecha_recepcion?.split('T')[0];
    const dia = dias7.find(d => d.fecha === fecha);
    if (dia) dia.count++;
  });
  const maxDia = Math.max(...dias7.map(d => d.count), 1);

  // ── Tiempo promedio de atención ──
  const atendidas5 = solicitudes.filter(s => s.paso === 5 && s.fecha_respuesta && s.fecha_recepcion);
  const promedioHoras = atendidas5.length > 0
    ? Math.round(atendidas5.reduce((acc, s) => {
        return acc + (new Date(s.fecha_respuesta) - new Date(s.fecha_recepcion)) / 3600000;
      }, 0) / atendidas5.length)
    : 0;

  const colores = ['#2563eb','#16a34a','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];

  return (
    <div style={{padding:28}}>

      {/* ── KPIs principales ── */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24}}>
        {[
          { label:'Total solicitudes',  val: total,      color:'#2563eb', icon:'📋' },
          { label:'En proceso',         val: enProceso,  color:'#f59e0b', icon:'⏳' },
          { label:'Atendidas',          val: atendidas,  color:'#16a34a', icon:'✅' },
          { label:'Rechazadas',         val: rechazadas, color:'#dc2626', icon:'❌' },
          { label:'Tasa de éxito',      val: tasaExito+'%', color:'#8b5cf6', icon:'📈' },
        ].map((k,i) => (
          <div key={i} style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:'18px 16px'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <div style={{fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.6px'}}>
                {k.label}
              </div>
              <span style={{fontSize:18}}>{k.icon}</span>
            </div>
            <div style={{fontSize:28, fontWeight:800, color: k.color, letterSpacing:'-1px'}}>
              {k.val}
            </div>
          </div>
        ))}
      </div>

      {/* ── Fila 1: Funnel por paso + Tendencia ── */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>

        {/* Funnel por paso */}
        <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:24}}>
          <div style={{fontSize:15, fontWeight:700, color:'#0f1d3a', marginBottom:4}}>
            Solicitudes por etapa
          </div>
          <div style={{fontSize:12, color:'#6b7280', marginBottom:20}}>Estado actual del flujo</div>
          {porPaso.map((p, i) => (
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
                <span style={{fontSize:12, fontWeight:600, color:'#374151', whiteSpace:'pre-line'}}>
                  {p.label}
                </span>
                <span style={{fontSize:13, fontWeight:700, color: p.color}}>{p.count}</span>
              </div>
              <div style={{height:10, background:'#f5f6fa', borderRadius:6, overflow:'hidden'}}>
                <div style={{
                  height:'100%', borderRadius:6,
                  width: `${Math.round((p.count / maxPaso) * 100)}%`,
                  background: p.color,
                  transition:'width .5s ease',
                  minWidth: p.count > 0 ? 8 : 0,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Tendencia últimos 7 días */}
        <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:24}}>
          <div style={{fontSize:15, fontWeight:700, color:'#0f1d3a', marginBottom:4}}>
            Solicitudes últimos 7 días
          </div>
          <div style={{fontSize:12, color:'#6b7280', marginBottom:20}}>Nuevas solicitudes por día</div>
          <div style={{display:'flex', alignItems:'flex-end', gap:8, height:120}}>
            {dias7.map((d, i) => (
              <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                <div style={{fontSize:10, fontWeight:700, color:'#2563eb'}}>{d.count > 0 ? d.count : ''}</div>
                <div style={{
                  width:'100%', borderRadius:'4px 4px 0 0',
                  height: `${Math.round((d.count / maxDia) * 90)}px`,
                  minHeight: d.count > 0 ? 8 : 2,
                  background: d.count > 0 ? '#2563eb' : '#e2e5ef',
                  transition:'height .5s ease',
                }} />
                <div style={{fontSize:9, color:'#9ca3af', textAlign:'center', lineHeight:1.2}}>
                  {d.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fila 2: Por país + Por unidad + Tiempo promedio ── */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16}}>

        {/* Por país */}
        <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:24}}>
          <div style={{fontSize:15, fontWeight:700, color:'#0f1d3a', marginBottom:4}}>Por país</div>
          <div style={{fontSize:12, color:'#6b7280', marginBottom:20}}>Distribución geográfica</div>
          {porPais.length === 0 ? (
            <div style={{color:'#9ca3af', fontSize:13}}>Sin datos</div>
          ) : porPais.map(([pais, count], i) => (
            <div key={i} style={{marginBottom:12}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                <span style={{fontSize:12, color:'#374151'}}>
                  {flagMap[pais]||'🌎'} {pais}
                </span>
                <span style={{fontSize:12, fontWeight:700, color: colores[i % colores.length]}}>
                  {count}
                </span>
              </div>
              <div style={{height:8, background:'#f5f6fa', borderRadius:4, overflow:'hidden'}}>
                <div style={{
                  height:'100%', borderRadius:4,
                  width:`${Math.round((count/maxPais)*100)}%`,
                  background: colores[i % colores.length],
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Por unidad de negocio */}
        <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:24}}>
          <div style={{fontSize:15, fontWeight:700, color:'#0f1d3a', marginBottom:4}}>Por unidad</div>
          <div style={{fontSize:12, color:'#6b7280', marginBottom:20}}>Top unidades de negocio</div>
          {porUnidad.length === 0 ? (
            <div style={{color:'#9ca3af', fontSize:13}}>Sin datos</div>
          ) : porUnidad.map(([unidad, count], i) => {
            const maxU = Math.max(...porUnidad.map(p => p[1]), 1);
            return (
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                  <span style={{fontSize:11, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'70%'}}>
                    {unidad}
                  </span>
                  <span style={{fontSize:12, fontWeight:700, color: colores[i % colores.length], flexShrink:0}}>
                    {count}
                  </span>
                </div>
                <div style={{height:8, background:'#f5f6fa', borderRadius:4, overflow:'hidden'}}>
                  <div style={{
                    height:'100%', borderRadius:4,
                    width:`${Math.round((count/maxU)*100)}%`,
                    background: colores[i % colores.length],
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Tiempo promedio + Métricas de eficiencia */}
        <div style={{background:'#fff', border:'1px solid #e2e5ef', borderRadius:12, padding:24}}>
          <div style={{fontSize:15, fontWeight:700, color:'#0f1d3a', marginBottom:4}}>Eficiencia</div>
          <div style={{fontSize:12, color:'#6b7280', marginBottom:20}}>Métricas de rendimiento</div>

          {/* Tiempo promedio */}
          <div style={{background:'#eff4ff', borderRadius:10, padding:'14px 16px', marginBottom:14, textAlign:'center'}}>
            <div style={{fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6}}>
              Tiempo promedio de atención
            </div>
            <div style={{fontSize:28, fontWeight:800, color:'#2563eb'}}>
              {promedioHoras < 24
                ? `${promedioHoras}h`
                : `${Math.floor(promedioHoras/24)}d ${promedioHoras%24}h`}
            </div>
            <div style={{fontSize:11, color:'#6b7280', marginTop:4}}>desde creación hasta atención</div>
          </div>

          {/* Gauge tasa de éxito */}
          <div style={{background:'#f0fdf4', borderRadius:10, padding:'14px 16px', marginBottom:14, textAlign:'center'}}>
            <div style={{fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6}}>
              Tasa de resolución
            </div>
            <div style={{fontSize:28, fontWeight:800, color:'#16a34a'}}>{tasaExito}%</div>
            <div style={{height:8, background:'#dcfce7', borderRadius:4, marginTop:8, overflow:'hidden'}}>
              <div style={{height:'100%', borderRadius:4, width:`${tasaExito}%`, background:'#16a34a'}} />
            </div>
          </div>

          {/* Rechazadas */}
          <div style={{background:'#fef2f2', borderRadius:10, padding:'14px 16px', textAlign:'center'}}>
            <div style={{fontSize:11, fontWeight:600, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6}}>
              Tasa de rechazo
            </div>
            <div style={{fontSize:28, fontWeight:800, color:'#dc2626'}}>
              {total > 0 ? Math.round((rechazadas/total)*100) : 0}%
            </div>
            <div style={{height:8, background:'#fecaca', borderRadius:4, marginTop:8, overflow:'hidden'}}>
              <div style={{
                height:'100%', borderRadius:4,
                width:`${total > 0 ? Math.round((rechazadas/total)*100) : 0}%`,
                background:'#dc2626'
              }} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
