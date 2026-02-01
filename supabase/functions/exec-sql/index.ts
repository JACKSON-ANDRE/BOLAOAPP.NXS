import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Verify Authentication (Temporarily Disabled for Emergency Fix)
        // const authHeader = req.headers.get('Authorization')
        // if (!authHeader) throw new Error('Missing Authorization header')

        // 2. Get SQL from body
        const { sql } = await req.json()
        if (!sql) throw new Error('Missing SQL query')

        console.log(`Executing SQL: ${sql}`)

        // 3. Connect to DB directly
        const dbUrl = Deno.env.get('DB_CONNECTION_STRING')
        if (!dbUrl) throw new Error('DB_CONNECTION_STRING is not set')

        const pool = new postgres.Pool(dbUrl, 1, true)
        const connection = await pool.connect()

        try {
            const result = await connection.queryObject(sql)
            return new Response(JSON.stringify({ success: true, result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        } finally {
            connection.release()
        }

    } catch (error) {
        console.error('SQL Exec Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        })
    }
})
