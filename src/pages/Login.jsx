// pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserByEmail, createOTP, validateOTP } from '../services/supabase';

export default function Login() {
  const { login } = useAuth();
  const [step, setStep]       = useState('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [devOtp, setDevOtp]   = useState(''); // temporal hasta conectar correos
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await getUserByEmail(email.trim());
      if (!user) { setStep('denied'); setLoading(false); return; }
      const codigo = await createOTP(email.trim());
      setDevOtp(codigo); // mostrar código en pantalla (modo sin correos)
      setStep('otp');
    } catch {
      setError('Error al verificar el correo. Intenta nuevamente.');
    }
    setLoading(false);
  }

async function handleOTPSubmit(e) {
  e.preventDefault();
  setError(''); setLoading(true);
  try {
    const valid = await validateOTP(email.trim(), otp.trim());
    if (!valid) { setError('Código incorrecto o expirado.'); setLoading(false); return; }
    const user = await getUserByEmail(email.trim());
    login({
      id:             user.id,
      email:          user.email,
      nombre:         user.nombre,
      pais:           user.pais,
      unidad_negocio: user.unidad_negocio,
      rol:            user.rol,
      categorias:     user.categorias || [],
    });
  } catch {
    setError('Error al validar el código.');
  }
  setLoading(false);
}

  return (
    <div style={s.bg}>
      <div style={s.card}>
        <div style={s.logoWrap}><span style={{fontSize:26}}>📦</span></div>
        <h1 style={s.h1}>DataMaster Portal</h1>
        <p style={s.sub}>Gestión de códigos SAP · Grupo Corporativo</p>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <label style={s.label}>Correo corporativo</label>
            <input
              style={s.input} type="email"
              placeholder="nombre@empresa.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
            />
            {error && <p style={s.error}>{error}</p>}
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Verificando…' : 'Continuar →'}
            </button>
            <p style={s.hint}>Solo usuarios autorizados por el equipo Data Master pueden ingresar.</p>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOTPSubmit}>
            {/* BANNER TEMPORAL — se elimina cuando se conecten los correos */}
            <div style={s.devBanner}>
              <div style={s.devTitle}>⚙️ Modo sin correos activo</div>
              <div style={s.devLabel}>Tu código de acceso es:</div>
              <div style={s.devCode}>{devOtp}</div>
              <div style={s.devNote}>Cuando conectes Resend, este banner desaparece y el código llegará por correo.</div>
            </div>

            <label style={s.label}>Ingresa el código de 6 dígitos</label>
            <input
              style={{...s.input, textAlign:'center', fontSize:22, letterSpacing:8, fontWeight:700}}
              type="text" placeholder="000000" maxLength={6}
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
              required autoFocus
            />
            {error && <p style={s.error}>{error}</p>}
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? 'Verificando…' : 'Ingresar'}
            </button>
            <button style={s.btnLink} type="button"
              onClick={() => { setStep('email'); setOtp(''); setError(''); setDevOtp(''); }}>
              ← Cambiar correo
            </button>
          </form>
        )}

        {step === 'denied' && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:44, marginBottom:14}}>🔒</div>
            <h3 style={{fontSize:16, fontWeight:700, color:'#0f1d3a', marginBottom:8}}>Acceso no autorizado</h3>
            <p style={{fontSize:13, color:'#6b7280', lineHeight:1.6, marginBottom:20}}>
              El correo <strong>{email}</strong> no tiene acceso.<br/>
              Contacta al equipo Data Master para solicitar acceso.
            </p>
            <button style={s.btnSecondary}
              onClick={() => { setStep('email'); setEmail(''); }}>
              Intentar con otro correo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  bg:        { minHeight:'100vh', background:'linear-gradient(135deg,#0f1d3a 0%,#1a3a6e 60%,#0f1d3a 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  card:      { background:'#fff', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 24px 64px rgba(0,0,0,.28)', textAlign:'center' },
  logoWrap:  { width:52, height:52, background:'#0f1d3a', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' },
  h1:        { fontSize:22, fontWeight:800, color:'#0f1d3a', marginBottom:6, letterSpacing:'-.4px' },
  sub:       { fontSize:13, color:'#6b7280', marginBottom:28, lineHeight:1.5 },
  label:     { display:'block', textAlign:'left', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 },
  input:     { width:'100%', padding:'12px 14px', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:15, color:'#111827', outline:'none', marginBottom:12, boxSizing:'border-box' },
  btnPrimary:{ width:'100%', padding:'12px', background:'#2563eb', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:8 },
  btnSecondary:{ width:'100%', padding:'10px', background:'#f5f6fa', color:'#374151', border:'1.5px solid #e2e5ef', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' },
  btnLink:   { width:'100%', padding:'8px', background:'none', border:'none', color:'#6b7280', fontSize:13, cursor:'pointer', marginTop:4 },
  error:     { fontSize:13, color:'#dc2626', marginBottom:8, textAlign:'left' },
  hint:      { fontSize:12, color:'#9ca3af', marginTop:12, lineHeight:1.5 },
  devBanner: { background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10, padding:'14px 16px', marginBottom:18, textAlign:'center' },
  devTitle:  { fontSize:12, fontWeight:700, color:'#16a34a', marginBottom:8 },
  devLabel:  { fontSize:11, color:'#6b7280', marginBottom:4 },
  devCode:   { fontSize:28, fontWeight:800, color:'#16a34a', letterSpacing:6, fontFamily:'monospace', margin:'4px 0 8px' },
  devNote:   { fontSize:11, color:'#9ca3af', lineHeight:1.4 },
};
