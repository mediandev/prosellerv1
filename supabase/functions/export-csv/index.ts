// ./supabase/functions/export-csv/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
serve(async (req)=>{
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // Cliente Supabase SEM AUTH
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Ajuste aqui o nome da sua tabela
    const { data, error } = await supabase.from("cliente").select("*");
    if (error) {
      console.error(error);
      return new Response("Erro ao buscar dados", {
        status: 500,
        headers: corsHeaders
      });
    }
    if (!data || data.length === 0) {
      return new Response("Nenhum dado encontrado.", {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="export.csv"'
        }
      });
    }
    // CSV automático
    const keys = Object.keys(data[0]);
    const header = keys.join(";");
    const lines = data.map((row)=>keys.map((key)=>{
        const value = row[key];
        if (value === null || value === undefined) return "";
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(";"));
    const csv = [
      header,
      ...lines
    ].join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="export.csv"'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response("Erro interno ao gerar CSV", {
      status: 500,
      headers: corsHeaders
    });
  }
});
