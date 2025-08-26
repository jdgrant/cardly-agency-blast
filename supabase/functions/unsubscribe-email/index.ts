import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
            <title>Unsubscribe Error</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .error { color: #d32f2f; }
            </style>
        </head>
        <body>
            <h1 class="error">Unsubscribe Error</h1>
            <p>No email address provided. Please use the unsubscribe link from your email.</p>
        </body>
        </html>`,
        {
          status: 400,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    // Check if already unsubscribed
    const { data: existing, error: checkError } = await supabase
      .from('email_unsubscribes')
      .select('email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Failed to check unsubscribe status: ${checkError.message}`);
    }

    if (existing) {
      // Already unsubscribed
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
            <title>Already Unsubscribed</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                .success { color: #2e7d32; }
            </style>
        </head>
        <body>
            <h1 class="success">Already Unsubscribed</h1>
            <p>The email address <strong>${email}</strong> is already unsubscribed from order status emails.</p>
            <p>You will not receive any further order status updates.</p>
        </body>
        </html>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    // Add to unsubscribe list
    const { error: insertError } = await supabase
      .from('email_unsubscribes')
      .insert([{ email }]);

    if (insertError) {
      throw new Error(`Failed to unsubscribe: ${insertError.message}`);
    }

    console.log(`Email unsubscribed: ${email}`);

    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
          <title>Successfully Unsubscribed</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { color: #2e7d32; }
              .info { color: #1976d2; }
          </style>
      </head>
      <body>
          <h1 class="success">Successfully Unsubscribed</h1>
          <p>The email address <strong>${email}</strong> has been successfully unsubscribed from order status emails.</p>
          <p class="info">You will no longer receive automated order status updates. You can still access your order status by visiting your order management page directly.</p>
          <p>If you unsubscribed by mistake, please contact our support team.</p>
      </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in unsubscribe function:", error);
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
          <title>Unsubscribe Error</title>
          <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #d32f2f; }
          </style>
      </head>
      <body>
          <h1 class="error">Unsubscribe Error</h1>
          <p>An error occurred while processing your unsubscribe request. Please try again later or contact support.</p>
          <p><strong>Error:</strong> ${error.message}</p>
      </body>
      </html>`,
      {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  }
};

serve(handler);