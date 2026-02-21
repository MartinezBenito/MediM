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

        // GET /metrics - Obtener últimos indicadores
        if (req.method === 'GET' && url.pathname.endsWith('/metrics')) {
            const { data, error } = await supabaseClient
                .from('indicadores_salud')
                .select('*')
                .eq('paciente_id', user.id)
                .order('fecha_registro', { ascending: false })
                .limit(30)

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // POST /metrics - Registrar nuevos indicadores
        if (req.method === 'POST' && url.pathname.endsWith('/metrics')) {
            const { presion, glucosa, peso, temperatura, notas } = await req.json()

            // Detectar alertas simples basadas en rangos normales
            let alertas = []
            if (presion && parseInt(presion.split('/')[0]) > 140) alertas.push('Presión alta - Contacta a tu médico')
            if (glucosa && glucosa > 150) alertas.push('Glucosa elevada - Monitorea tu dieta')
            if (peso && peso > 100) alertas.push('Peso fuera del rango normal - Consulta')

            const { data, error } = await supabaseClient
                .from('indicadores_salud')
                .insert([{
                    paciente_id: user.id,
                    presion,
                    glucosa,
                    peso,
                    temperatura,
                    notas,
                    alertas,
                    fecha_registro: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 201,
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