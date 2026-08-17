/**
 * Best-effort log when a customer hits the insufficient buying power warning.
 */
export async function logInsufficientBuyingPowerEvent(supabase, {
  userId,
  symbol,
  stockName,
  requiredAmount,
  availableAmount,
  quantity,
  orderType,
  currency,
}) {
  if (!userId || !symbol) return;
  try {
    const { error } = await supabase.from('insufficient_buying_power_events').insert({
      user_id: userId,
      symbol,
      stock_name: stockName || null,
      required_amount: requiredAmount,
      available_amount: availableAmount,
      quantity: quantity ?? null,
      order_type: orderType || null,
      currency: currency || 'USD',
    });
    if (error) return;
  } catch {
    // best-effort; do not block the customer flow
  }
}
