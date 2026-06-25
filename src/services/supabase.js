// services/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── USUARIOS ──────────────────────────────────────────────────
export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('activo', true)
    .single();
  if (error) return null;
  return data;
}

export async function getAllUsers() {
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createUser(u) {
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{
      nombre:         u.nombre,
      email:          u.email.toLowerCase().trim(),
      pais:           u.pais,
      unidad_negocio: u.unidadNegocio,
      rol:            u.rol,
      categorias:     u.categorias || [],
      activo:         true,
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleUserActivo(id, activo) {
  const { error } = await supabase
    .from('usuarios')
    .update({ activo })
    .eq('id', id);
  if (error) throw error;
}

// ── OTP ───────────────────────────────────────────────────────
export async function createOTP(email) {
  // Limpiar OTPs anteriores del mismo email
  await supabase.from('codigos_otp').delete().eq('email', email);

  const codigo  = Math.floor(100000 + Math.random() * 900000).toString();
  const expira  = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('codigos_otp')
    .insert([{ email: email.toLowerCase().trim(), codigo, expira, usado: false }]);
  if (error) throw error;
  return codigo;
}

export async function validateOTP(email, codigo) {
  const { data, error } = await supabase
    .from('codigos_otp')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('codigo', codigo.trim())
    .eq('usado', false)
    .single();

  if (error || !data) return false;
  if (new Date(data.expira) < new Date()) return false;

  await supabase.from('codigos_otp').update({ usado: true }).eq('id', data.id);
  return true;
}

// ── SOLICITUDES ───────────────────────────────────────────────
const PAIS_PREFIX = {
  'Perú':'PE','Colombia':'CO','Chile':'CL','Ecuador':'EC','Bolivia':'BO'
};

function generateTicketID(pais) {
  const prefix = PAIS_PREFIX[pais] || 'XX';
  const year   = new Date().getFullYear();
  const rand   = Math.floor(1000 + Math.random() * 9000);
  return `#${prefix}-${year}-${rand}`;
}

export async function getSolicitudes(emailFilter = null) {
  let query = supabase
    .from('solicitudes')
    .select('*')
    .order('fecha_recepcion', { ascending: false });

  if (emailFilter) query = query.eq('email_solicitante', emailFilter);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createSolicitud(data) {
  const pais = data.pais || 'Perú';
  const ticket_id = generateTicketID(pais);
  const flujo = data.unidad_negocio === 'UNACEM PERU' ? 'extendido' : 'directo';
  const paso  = flujo === 'extendido' ? 2 : 4;

  // 1. Crear solicitud principal
  const { data: sol, error: errSol } = await supabase
    .from('solicitudes')
    .insert([{
      ticket_id,
      email_solicitante:  data.email_solicitante,
      nombre_solicitante: data.nombre_solicitante,
      pais,
      unidad_negocio:     data.unidad_negocio,
      tipo_solicitud:     'Creación',
      flujo,
      paso,
      estado:             'Pendiente',
      fecha_recepcion:    new Date().toISOString(),
    }])
    .select()
    .single();
  if (errSol) throw errSol;

  // 2. Crear posiciones — cada una con su categoría
  if (data.posiciones && data.posiciones.length > 0) {
    const posicionesData = data.posiciones.map(p => ({
      solicitud_id:  sol.id,
      denominacion:  p.denominacion,
      unidad_medida: p.unidad_medida,
      texto_pedido:  p.texto_pedido || '',
      categoria:     p.categoria || '',
      estado:        'Pendiente',
    }));
    const { error: errPos } = await supabase
      .from('posiciones')
      .insert(posicionesData);
    if (errPos) throw errPos;
  }

  return sol.ticket_id;
}
export async function updateEstado(id, estado) {
  const { error } = await supabase
    .from('solicitudes')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

export async function actualizarPaso(id, paso, asignado_a = null) {
  const update = { paso };
  if (asignado_a) update.asignado_a = asignado_a;
  const { error } = await supabase
    .from('solicitudes')
    .update(update)
    .eq('id', id);
  if (error) throw error;
}

export async function aprobarPorLider(id, aprobado) {
  const { error } = await supabase
    .from('solicitudes')
    .update({ aprobado_por_lider: aprobado })
    .eq('id', id);
  if (error) throw error;
}

export async function atenderSolicitud(id, atendido_por, codigoMaterial) {
  const { error } = await supabase
    .from('solicitudes')
    .update({
      estado:           'Atendida',
      fecha_respuesta:  new Date().toISOString(),
      atendido_por,
      cantidad_codigos: codigoMaterial,
      paso:             5,
    })
    .eq('id', id);
  if (error) throw error;
}

// ── NUEVAS FUNCIONES PARA EL FLUJO ──────────────────────
export async function getSolicitudesPorPaso(paso) {
  const { data, error } = await supabase
    .from('solicitudes')
    .select('*, posiciones(count)')
    .eq('paso', paso)
    .order('fecha_recepcion', { ascending: false });
  if (error) throw error;

  // Normalizar: convertir posiciones:[{count:N}] → posiciones_count: N
  return (data || []).map(sol => ({
    ...sol,
    posiciones_count: sol.posiciones?.[0]?.count ?? 0,
  }));
}

export async function getSolicitudesPorRol(rol) {
  let pasos = [];
  if (rol === 'GESTOR DE INVENTARIO') pasos = [2];
  if (rol === 'LIDER DE CATEGORÍA') pasos = [3];
  if (rol === 'DATA MASTER' || rol === 'ADMINISTRADOR') pasos = [4, 5];
  if (rol === 'SOLICITANTE') pasos = [1, 2, 3, 4, 5];

  const { data, error } = await supabase
    .from('solicitudes')
    .select('*')
    .in('paso', pasos)
    .order('fecha_recepcion', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function avanzarPaso(id, paso, datos = {}) {
  const extra = paso === 3 ? { fecha_asignado_lider: new Date().toISOString() } : {};
  const { error } = await supabase
    .from('solicitudes')
    .update({ paso, ...datos, ...extra })
    .eq('id', id);
  if (error) {
    console.error('Error avanzarPaso:', error);
    throw error;
  }
}

export async function rechazarSolicitud(id, motivo = '') {
  const { error } = await supabase
    .from('solicitudes')
    .update({ paso: 1, estado: 'Rechazada', atendido_por: motivo })
    .eq('id', id);
  if (error) throw error;
}

export async function getAllSolicitudes() {
  const { data, error } = await supabase
    .from('solicitudes')
    .select('*')
    .order('fecha_recepcion', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSolicitudById(id) {
  const { data, error } = await supabase
    .from('solicitudes')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ── POSICIONES ─────────────────────────────────────────────────
export async function getPosicionesBySolicitud(solicitud_id) {
  const { data, error } = await supabase
    .from('posiciones')
    .select('*')
    .eq('solicitud_id', solicitud_id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updatePosicion(id, datos) {
  const { error } = await supabase
    .from('posiciones')
    .update(datos)
    .eq('id', id);
  if (error) throw error;
}

export async function actualizarPosicion(posicionId, datos) {
  const { data, error } = await supabase
    .from('posiciones')
    .update(datos)
    .eq('id', posicionId)
    .select();
  if (error) {
    console.error('Error actualizarPosicion:', error);
    throw error;
  }
  return data;
}

// Obtener gestores por categoría
export async function getGestoresPorCategoria(categoria) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('rol', 'GESTOR DE INVENTARIO')
    .eq('activo', true)
    .contains('categorias', [categoria]);
  if (error) throw error;
  return data || [];
}

export async function getNombreUsuario(email) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('nombre')
    .eq('email', email)
    .single();
  if (error) return email; // fallback: muestra email si no encuentra
  return data?.nombre || email;
}

// Verifica si al menos una posición fue revisada por algún gestor
// (para avanzar al paso 3 parcialmente)
export async function hayPosicionesRevisadas(solicitudId) {
  const { data, error } = await supabase
    .from('posiciones')
    .select('estado_gestor')
    .eq('solicitud_id', solicitudId)
    .eq('estado_gestor', 'Revisada');
  if (error) throw error;
  return data.length > 0;
}

// Verifica si TODAS las posiciones no rechazadas fueron revisadas por gestor
export async function todasPosicionesRevisadas(solicitudId) {
  const { data, error } = await supabase
    .from('posiciones')
    .select('estado_gestor, estado')
    .eq('solicitud_id', solicitudId);
  if (error) throw error;
  const activas = data.filter(p => p.estado !== 'Rechazada');
  return activas.length > 0 && activas.every(p => p.estado_gestor === 'Revisada');
}
