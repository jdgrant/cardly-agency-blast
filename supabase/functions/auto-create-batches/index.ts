import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Auto-create batches function called');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Session ID is required');
    }

    // Verify admin session
    const { data: sessionData, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('value')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !sessionData?.value) {
      throw new Error('Invalid admin session');
    }

    console.log('Admin session verified');

    // Get all orders with their mailing windows
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('mailing_window')
      .eq('status', 'approved');

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log('Found orders:', orders?.length || 0);

    // Get unique mailing windows
    const uniqueMailingWindows = [...new Set(orders?.map(o => o.mailing_window) || [])];
    console.log('Unique mailing windows:', uniqueMailingWindows);

    // Standard batch configurations
    const batchConfigs: Record<string, { name: string; dropDate: string }> = {
      'dec-1-5': { 
        name: 'December 1-5 Batch', 
        dropDate: `${new Date().getFullYear()}-11-29` 
      },
      'dec-6-10': { 
        name: 'December 6-10 Batch', 
        dropDate: `${new Date().getFullYear()}-12-04` 
      },
      'dec-11-15': { 
        name: 'December 11-15 Batch', 
        dropDate: `${new Date().getFullYear()}-12-09` 
      },
      'dec-16-20': { 
        name: 'December 16-20 Batch', 
        dropDate: `${new Date().getFullYear()}-12-14` 
      },
    };

    // Get existing batches
    const { data: existingBatches, error: batchesError } = await supabase
      .from('batches')
      .select('name');

    if (batchesError) {
      console.error('Error fetching existing batches:', batchesError);
      throw batchesError;
    }

    const existingBatchNames = existingBatches?.map(b => b.name) || [];
    console.log('Existing batch names:', existingBatchNames);

    let createdBatches = 0;
    const createdBatchNames: string[] = [];

    // Create batches for each unique mailing window that has orders
    for (const mailingWindow of uniqueMailingWindows) {
      const config = batchConfigs[mailingWindow];
      
      if (!config) {
        console.log(`No standard config found for mailing window: ${mailingWindow}`);
        continue;
      }

      // Skip if batch already exists
      if (existingBatchNames.includes(config.name)) {
        console.log(`Batch already exists: ${config.name}`);
        continue;
      }

      console.log(`Creating batch for mailing window: ${mailingWindow}`);

      const { data: batchId, error: createError } = await supabase
        .rpc('create_batch', {
          session_id_param: session_id,
          batch_name: config.name,
          batch_drop_date: config.dropDate
        });

      if (createError) {
        console.error(`Error creating batch for ${mailingWindow}:`, createError);
        continue;
      }

      console.log(`Successfully created batch: ${config.name}`);
      createdBatches++;
      createdBatchNames.push(config.name);
    }

    console.log(`Auto-creation complete. Created ${createdBatches} batches`);

    return new Response(
      JSON.stringify({
        success: true,
        created_count: createdBatches,
        created_batches: createdBatchNames,
        message: createdBatches > 0 
          ? `Successfully created ${createdBatches} batches for existing mailing windows`
          : 'All required batches already exist'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Auto-create batches error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to auto-create batches' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});