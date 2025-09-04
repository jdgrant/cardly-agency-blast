import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, metadata, returnUrl, orderId, promoCode, originalAmount } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Determine success/cancel URLs based on context
    let successUrl, cancelUrl;
    
    if (returnUrl) {
      // Order management flow - return to the same page
      successUrl = `${returnUrl}?payment=success`;
      cancelUrl = `${returnUrl}?payment=cancelled`;
    } else {
      // Original wizard flow
      const origin = req.headers.get("origin") || "http://localhost:3000";
      successUrl = `${origin}/#/order-confirmation?session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${origin}/#/wizard`;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: orderId ? `Holiday Card Order #${orderId.slice(0, 8)}` : 'Holiday Cards Order',
              description: description || 'Custom holiday card printing and mailing service',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        ...(orderId && { orderId }),
        ...(promoCode && { promoCode, originalAmount })
      },
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});