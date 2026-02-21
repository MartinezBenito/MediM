import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const url = new URL(req.url)

        // GET /achievements - Obtener logros del paciente
        if (req.method === 'GET' && url.pathname.endsWith('/achievements')) {
            const { data, error } = await supabaseClient
                .from('logros')
                .select('*')
                .eq('paciente_id', user.id)

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // GET /challenges - Obtener retos activos
        if (req.method === 'GET' && url.pathname.endsWith('/challenges')) {
            const { data, error } = await supabaseClient
                .from('retos')
                .select('*')
                .eq('paciente_id', user.id)
                .eq('activo', true)

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // POST /challenges/:id/progress - Actualizar progreso de reto
        if (req.method === 'POST' && url.pathname.includes('/progress')) {
            const { reto_id, progreso } = await req.json()

            const { data, error } = await supabaseClient
                .from('retos')
                .update({ progreso, fecha_actualizacion: new Date().toISOString() })
                .eq('id', reto_id)
                .select()
                .single()

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // GET /points - Obtener puntos totales
        if (req.method === 'GET' && url.pathname.endsWith('/points')) {
            const { data, error } = await supabaseClient
                .from('pacientes')
                .select('puntos, nivel')
                .eq('auth_uid', user.id)
                .single()

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers: corsHeaders })

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})