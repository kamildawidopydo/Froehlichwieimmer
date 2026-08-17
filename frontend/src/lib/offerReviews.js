import { supabase } from '@/lib/supabase';
import { roundToQuarter } from '@/lib/starRating';

/** Anzeigename aus Profil: "Thomas K." */
export function formatAuthorDisplayName(profile) {
  const first = (profile?.first_name || '').trim() || 'Nutzer';
  const last = (profile?.last_name || '').trim();
  if (!last) return first;
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}

function reviewProfile(row) {
  const p = row?.profiles;
  if (Array.isArray(p)) return p[0] || null;
  return p || null;
}

/** Admin-Tabelle: vollständiger Name + Metadaten */
export function getAdminReviewAuthorInfo(row) {
  const guestFirst = (row?.guest_first_name || '').trim();
  const guestLast = (row?.guest_last_name || '').trim();
  const guestFull = [guestFirst, guestLast].filter(Boolean).join(' ');

  const profile = reviewProfile(row);
  const profileFirst = (profile?.first_name || '').trim();
  const profileLast = (profile?.last_name || '').trim();
  const profileFull = [profileFirst, profileLast].filter(Boolean).join(' ');

  const isGuest =
    row?.reviewer_kind === 'guest' || (!row?.user_id && Boolean(guestFull || guestFirst || guestLast));

  const fullName = guestFull || profileFull || (row?.author_display_name || '').trim() || '—';
  const publicName = (row?.author_display_name || '').trim() || '—';

  return {
    fullName,
    publicName,
    email: profile?.email?.trim() || null,
    isGuest,
  };
}

export async function submitOfferReview({ offerId, stars, body, productType }) {
  const { data, error } = await supabase.rpc('submit_offer_review', {
    p_savings_offer_id: offerId,
    p_stars: roundToQuarter(stars),
    p_body: body.trim(),
    p_product_type: productType === 'Flexgeld' ? 'Flexgeld' : 'Festgeld',
  });
  return { data, error };
}

export async function submitGuestOfferReview({
  offerId,
  stars,
  body,
  productType,
  guestSessionToken,
  firstName,
  lastName,
}) {
  const { data, error } = await supabase.rpc('submit_guest_offer_review', {
    p_savings_offer_id: offerId,
    p_stars: roundToQuarter(stars),
    p_body: body.trim(),
    p_product_type: productType === 'Flexgeld' ? 'Flexgeld' : 'Festgeld',
    p_guest_session_token: guestSessionToken,
    p_first_name: firstName.trim(),
    p_last_name: lastName.trim(),
  });
  return { data, error };
}

/** RPC/PostgREST kann leeres Objekt liefern — für stabile Formular-Anzeige normalisieren */
export function normalizeOfferReviewRow(row) {
  if (!row || typeof row !== 'object') return null;
  const id = row.id;
  const status = row.status;
  if (!id || !status) return null;
  return row;
}

export async function fetchMyGuestReviewForOffer(offerId, guestSessionToken) {
  if (!offerId || !guestSessionToken) return { data: null, error: null };

  const { data, error } = await supabase.rpc('get_guest_offer_review', {
    p_savings_offer_id: offerId,
    p_guest_session_token: guestSessionToken,
  });
  if (error) return { data: null, error };
  return { data: normalizeOfferReviewRow(data), error: null };
}

export async function fetchApprovedReviewsForOffer(offerId, { productType, limit = 50 } = {}) {
  let q = supabase
    .from('offer_reviews')
    .select('id, stars, body, product_type, author_display_name, created_at')
    .eq('savings_offer_id', offerId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (productType && productType !== 'Alle') {
    q = q.eq('product_type', productType);
  }

  const { data, error } = await q;
  return { data: data || [], error };
}

export async function fetchMyReviewForOffer(offerId) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) return { data: null, error: null };

  const { data, error } = await supabase
    .from('offer_reviews')
    .select('*')
    .eq('savings_offer_id', offerId)
    .eq('user_id', auth.user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') return { data: null, error };
  return { data: normalizeOfferReviewRow(data), error: null };
}

export async function fetchOfferReviewStats(offerId) {
  const { data, error } = await supabase
    .from('offer_review_stats')
    .select('review_count, avg_stars')
    .eq('savings_offer_id', offerId)
    .maybeSingle();

  if (error) return { count: 0, average: null, error };
  return {
    count: data?.review_count ?? 0,
    average: data?.avg_stars != null ? roundToQuarter(Number(data.avg_stars)) : null,
    error: null,
  };
}

export async function fetchOfferReviewStatsBatch(offerIds) {
  if (!offerIds?.length) return new Map();
  const { data, error } = await supabase
    .from('offer_review_stats')
    .select('savings_offer_id, review_count, avg_stars')
    .in('savings_offer_id', offerIds);

  if (error) return { map: new Map(), error };

  const map = new Map();
  for (const row of data || []) {
    map.set(row.savings_offer_id, {
      count: row.review_count ?? 0,
      average: row.avg_stars != null ? roundToQuarter(Number(row.avg_stars)) : null,
    });
  }
  return { map, error: null };
}

/** Admin */
export async function adminApproveReview(reviewId, note) {
  return supabase.rpc('approve_offer_review', {
    p_review_id: reviewId,
    p_decision_note: note || null,
  });
}

export async function adminRejectReview(reviewId, reason) {
  return supabase.rpc('reject_offer_review', {
    p_review_id: reviewId,
    p_rejection_reason: reason || null,
  });
}

export async function adminDeleteReview(reviewId) {
  return supabase.rpc('delete_offer_review', { p_review_id: reviewId });
}

/** @deprecated use adminDeleteReview */
export const adminDeleteApprovedReview = adminDeleteReview;
