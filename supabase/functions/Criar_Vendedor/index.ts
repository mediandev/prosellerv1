import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
console.log("Initializing create_newuser function");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_KEY');
serve(async (req)=>{
  try {
    const requestBody = await req.json();
    const { email, password } = requestBody;
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: "Email and password are required."
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    const url = `${SUPABASE_URL}/auth/v1/signup`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    const responseData = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: responseData.error || 'Unknown error',
        status: response.status
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    if (responseData.user && responseData.user.id) {
      return new Response(JSON.stringify({
        message: "User created successfully",
        userId: responseData.user.id
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({
        message: "Unexpected error.",
        responseData
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
