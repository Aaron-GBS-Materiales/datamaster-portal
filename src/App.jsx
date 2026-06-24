// App.jsx
import GestorInventario from './pages/GestorInventario';
import LiderCategoria   from './pages/LiderCategoria';
import BaseDatos        from './pages/BaseDatos';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import NuevaSolicitud from './pages/NuevaSolicitud';
import Usuarios       from './pages/Usuarios';

function SuccessModal({ ticketID, onClose }) {
  return (
    <div style={ms.bg} onClick={onClose}>
      <div style={ms.modal} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:52,marginBottom:16}}>✅</div>
        <h3 style={ms.h3}>¡Solicitud enviada!</h3>
        <p style={ms.p}>Tu solicitud fue registrada. El equipo Data Master la atenderá pronto.</p>
        <div style={ms.ticket}>{ticketID}</div>
        <p style={ms.hint}>Guarda este número para hacer seguimiento.</p>
        <button style={ms.btn} onClick={onClose}>Entendido</button>
      </div>
    </div>
  );
}
const ms = {
  bg:     { position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300,padding:24 },
  modal:  { background:'#fff',borderRadius:16,padding:'40px 36px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 24px 64px rgba(0,0,0,.25)' },
  h3:     { fontSize:20,fontWeight:800,color:'#0f1d3a',marginBottom:8 },
  p:      { fontSize:14,color:'#6b7280',lineHeight:1.6,marginBottom:16 },
  ticket: { fontFamily:'monospace',fontSize:20,fontWeight:700,color:'#2563eb',background:'#eff4ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 20px',display:'inline-block',marginBottom:10 },
  hint:   { fontSize:12,color:'#9ca3af',marginBottom:20 },
  btn:    { padding:'11px 28px',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer' },
};

const NAV_ADMIN = [
  { id:'dashboard',       icon:'📊', label:'Dashboard' },
  { id:'gestorInventario', icon:'📦', label:'Gestor de Inventario' },
  { id:'liderCategoria',   icon:'✓',  label:'Líder de Categoría' },
  { id:'baseDatos',        icon:'💾', label:'Base de Datos' },
  { id:'usuarios',         icon:'👥', label:'Usuarios' },
];

const NAV_USER = [
  { id:'nueva',  icon:'➕', label:'Nueva solicitud' },
  { id:'missol', icon:'📋', label:'Mis solicitudes' },
];
const TITLES = { dashboard:'Dashboard', solicitudes:'Solicitudes', nueva:'Nueva solicitud', missol:'Mis solicitudes', usuarios:'Usuarios' };

function AppShell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR' || user?.rol === 'DATA MASTER';
  
  // Mostrar solo vistas según el rol
  let navItems = [];
  if (isAdmin) {
    navItems = NAV_ADMIN;
  } else {
    navItems = [
      { id:'nueva',  icon:'➕', label:'Nueva solicitud' },
      { id:'missol', icon:'📋', label:'Mis solicitudes' },
    ];
    // Si es GESTOR DE INVENTARIO, mostrar su sección
    if (user?.rol === 'GESTOR DE INVENTARIO') {
      navItems = [
        { id:'gestorInventario', icon:'📦', label:'Inventario' },
        { id:'missol', icon:'📋', label:'Mis solicitudes' },
      ];
    }
    // Si es LIDER DE CATEGORÍA, mostrar su sección
    if (user?.rol === 'LIDER DE CATEGORÍA') {
      navItems = [
        { id:'liderCategoria', icon:'✓', label:'Aprobaciones' },
        { id:'missol', icon:'📋', label:'Mi historial' },
      ];
    }
  }

  const [page, setPage] = useState(isAdmin ? 'dashboard' : 'nueva');
  const [ticket, setTicket] = useState(null);
  const initials = user?.nombre?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?';

  return (
    <div style={sh.shell}>
      {/* SIDEBAR */}
      <aside style={sh.sidebar}>
        <div style={sh.logo}>
          <div style={sh.logoIcon}>📦</div>
          <div>
            <div style={sh.logoName}>DataMaster</div>
            <div style={sh.logoSub}>Portal SAP</div>
          </div>
        </div>
        <div style={sh.userBox}>
          <div style={sh.av}>{initials}</div>
          <div>
            <div style={sh.uName}>{user?.nombre}</div>
            <div style={sh.uMeta}>{user?.rol}</div>
          </div>
        </div>
        <nav style={sh.nav}>
          {navItems.map(item=>(
            <button key={item.id}
              style={{...sh.navItem,...(page===item.id?sh.navActive:{})}}
              onClick={()=>setPage(item.id)}>
              <span style={{fontSize:15}}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <button style={sh.logout} onClick={logout}>↩ Cerrar sesión</button>
      </aside>

      {/* MAIN */}
      <div style={sh.main}>
        <div style={sh.topbar}>
          <div style={sh.pageTitle}>
            {page === 'dashboard' && 'Dashboard'}
            {page === 'gestorInventario' && 'Gestor de Inventario'}
            {page === 'liderCategoria' && 'Líder de Categoría'}
            {page === 'baseDatos' && 'Base de Datos'}
            {page === 'nueva' && 'Nueva solicitud'}
            {page === 'missol' && 'Mis solicitudes'}
            {page === 'usuarios' && 'Usuarios'}
          </div>
          <div style={sh.av}>{initials}</div>
        </div>
        <div>
          {page === 'dashboard' && <Dashboard />}
          {page === 'gestorInventario' && <GestorInventario />}
          {page === 'liderCategoria' && <LiderCategoria />}
          {page === 'baseDatos' && <BaseDatos />}
          {page === 'nueva' && <NuevaSolicitud onSuccess={id=>{setTicket(id);}} />}
          {page === 'missol' && <Dashboard soloMias />}
          {page === 'usuarios' && <Usuarios />}
        </div>
      </div>

      {ticket && <SuccessModal ticketID={ticket} onClose={()=>{setTicket(null);setPage(isAdmin?'dashboard':'missol');}} />}
    </div>
  );
}

const sh = {
  shell:    { display:'flex',minHeight:'100vh',fontFamily:'Inter,sans-serif' },
  sidebar:  { width:240,minHeight:'100vh',background:'#0f1d3a',display:'flex',flexDirection:'column',position:'fixed',left:0,top:0,zIndex:50 },
  logo:     { padding:'20px 18px 16px',borderBottom:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',gap:10 },
  logoIcon: { width:34,height:34,background:'#2563eb',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 },
  logoName: { fontSize:15,fontWeight:700,color:'#fff' },
  logoSub:  { fontSize:10,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:'.5px',marginTop:1 },
  userBox:  { margin:'12px',background:'rgba(255,255,255,.06)',borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',gap:10 },
  av:       { width:32,height:32,borderRadius:'50%',background:'#2563eb',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0 },
  uName:    { fontSize:13,fontWeight:600,color:'#fff' },
  uMeta:    { fontSize:10,color:'rgba(255,255,255,.4)' },
  nav:      { flex:1,padding:'8px 10px',display:'flex',flexDirection:'column',gap:2 },
  navItem:  { display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:8,border:'none',background:'transparent',color:'rgba(255,255,255,.55)',fontSize:13,fontWeight:500,cursor:'pointer',textAlign:'left',width:'100%' },
  navActive:{ background:'rgba(37,99,235,.35)',color:'#fff' },
  logout:   { margin:'12px',padding:'9px 14px',background:'rgba(255,255,255,.06)',border:'none',borderRadius:8,color:'rgba(255,255,255,.5)',fontSize:12,cursor:'pointer',textAlign:'left' },
  main:     { marginLeft:240,flex:1,background:'#f5f6fa',minHeight:'100vh' },
  topbar:   { height:56,background:'#fff',borderBottom:'1px solid #e2e5ef',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',position:'sticky',top:0,zIndex:40 },
  pageTitle:{ fontSize:16,fontWeight:700,color:'#0f1d3a' },
};

function Inner() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:14,color:'#9ca3af'}}>
      Cargando…
    </div>
  );
  return user ? <AppShell /> : <Login />;
}

export default function App() {
  return <AuthProvider><Inner /></AuthProvider>;
}
