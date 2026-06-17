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
  const ticket_id = generateTicketID(data.pais);
  const { data: sol, error } = await supabase
    .from('solicitudes')
    .insert([{
      ticket_id,
      email_solicitante:  data.email,
      nombre_solicitante: data.nombre,
      pais:               data.pais,
      unidad_negocio:     data.unidadNegocio,
      tipo_solicitud:     'Creación',
      denominacion:       data.denominacion,
      unidad_medida:      data.unidadMedida,
      texto_pedido:       data.textoPedido,
      estado:             'Pendiente',
      fecha_recepcion:    new Date().toISOString(),
    }])
    .select()
    .single();
  if (error) throw error;
  return sol;
}

export async function updateEstado(id, estado) {
  const { error } = await supabase
    .from('solicitudes')
    .update({ estado })
    .eq('id', id);
  if (error) throw error;
}

export async function atenderSolicitud(id, atendido_por, cantidad_codigos) {
  const { error } = await supabase
    .from('solicitudes')
    .update({
      estado:           'Atendida',
      fecha_respuesta:  new Date().toISOString(),
      atendido_por,
      cantidad_codigos: parseInt(cantidad_codigos),
    })
    .eq('id', id);
  if (error) throw error;
}
