import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientRecord {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface ReplaceRequest {
  orderId: string;
  clientRecords: ClientRecord[];
  csvFileUrl: string;
  adminSessionId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, clientRecords, csvFileUrl, adminSessionId }: ReplaceRequest = await req.json();

    if (!orderId || !clientRecords || !csvFileUrl) {
      throw new Error('Missing required parameters');
    }

    console.log(`Replacing client list for order ${orderId} with ${clientRecords.length} records`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin session if provided
    if (adminSessionId) {
      const { data: sessionData } = await supabase
        .from('admin_sessions')
        .select('value')
        .eq('session_id', adminSessionId)
        .single();

      if (!sessionData || !sessionData.value) {
        throw new Error('Invalid admin session');
      }
    }

    // Delete all existing client records for this order
    console.log('Deleting existing client records...');
    const { error: deleteError } = await supabase
      .from('client_records')
      .delete()
      .eq('order_id', orderId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete old records: ${deleteError.message}`);
    }

    console.log('Deleted old client records');

    // Insert new client records
    const { error: insertError } = await supabase.rpc('insert_client_records', {
      order_id: orderId,
      client_data: clientRecords
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert new records: ${insertError.message}`);
    }

    console.log('Inserted new client records');

    // Update order with new CSV URL and client count
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        csv_file_url: csvFileUrl,
        client_count: clientRecords.length
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    console.log('Updated order with new client count');

    return new Response(
      JSON.stringify({ 
        success: true,
        count: clientRecords.length
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in replace-client-list function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
