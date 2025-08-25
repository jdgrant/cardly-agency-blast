import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
    
    console.log("=== MAILGUN TEST ===");
    console.log("MAILGUN_API_KEY present:", !!MAILGUN_API_KEY);
    console.log("MAILGUN_API_KEY length:", MAILGUN_API_KEY ? MAILGUN_API_KEY.length : 0);
    console.log("First 10 chars:", MAILGUN_API_KEY ? MAILGUN_API_KEY.substring(0, 10) : "none");
    console.log("All env vars with MAILGUN:", Object.keys(Deno.env.toObject()).filter(k => k.includes('MAILGUN')));
    
    if (!MAILGUN_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "MAILGUN_API_KEY not found in environment",
          availableEnvVars: Object.keys(Deno.env.toObject())
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Test basic Mailgun API connectivity
    const testResponse = await fetch('https://api.mailgun.net/v3/mg.sendyourcards.io/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        from: 'test@mg.sendyourcards.io',
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test'
      })
    });

    const responseText = await testResponse.text();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        mailgunApiKeyPresent: true,
        testApiResponse: {
          status: testResponse.status,
          statusText: testResponse.statusText,
          body: responseText
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Test error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);