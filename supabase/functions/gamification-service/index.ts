import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) throw new Error('Unauthorized')

        const url = new URL(req.url)

        // GET /appointments - Listar citas del paciente
        if (req.method === 'GET' && url.pathname.endsWith('/appointments')) {
            const { data, error } = await supabaseClient
                .from('citas')
                .select('*, doctores(nombre, especialidad)')
                .eq('paciente_id', user.id)
                .order('fecha', { ascending: true })

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // POST /appointments - Crear nueva cita
        if (req.method === 'POST' && url.pathname.endsWith('/appointments')) {
            const { doctor_id, fecha, motivo, especialidad } = await req.json()

            const { data, error } = await supabaseClient
                .from('citas')
                .insert([{
                    paciente_id: user.id,
                    doctor_id,
                    fecha,
                    motivo,
                    especialidad,
                    estado: 'pendiente'
                }])
                .select()
                .single()

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 201,
            })
        }

        // PUT /appointments/:id - Actualizar cita
        if (req.method === 'PUT' && url.pathname.includes('/appointments/')) {
            const id = url.pathname.split('/').pop()
            const body = await req.json()

            const { data, error } = await supabaseClient
                .from('citas')
                .update(body)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // DELETE /appointments/:id - Cancelar cita
        if (req.method === 'DELETE' && url.pathname.includes('/appointments/')) {
            const id = url.pathname.split('/').pop()

            const { error } = await supabaseClient
                .from('citas')
                .delete()
                .eq('id', id)

            if (error) throw error

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
        })

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})