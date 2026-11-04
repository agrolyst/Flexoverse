import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authorization = (req.headers.get("Authorization") || "").trim();
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : authorization;
    if (!token) return new Response(JSON.stringify({ error: "Sign in to search music." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY");
    if (!publishableKey) throw new Error("Supabase publishable key is unavailable.");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Your session is invalid. Sign in again." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "YouTube music search is not configured yet. Add the YOUTUBE_API_KEY secret in Supabase." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || "").trim().slice(0, 100);
    if (query.length < 2) return new Response(JSON.stringify({ error: "Enter at least two characters to search." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({ part: "snippet", q: query, type: "video", videoEmbeddable: "true", maxResults: "10", safeSearch: "strict", key: apiKey }).toString();
    const ytResponse = await fetch(url);
    const ytData = await ytResponse.json();
    if (!ytResponse.ok) {
      const reason = ytData?.error?.errors?.[0]?.reason;
      const message = reason === "quotaExceeded" ? "YouTube search quota has been reached. Try again later." : "YouTube could not complete this music search.";
      return new Response(JSON.stringify({ error: message }), { status: ytResponse.status === 403 ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const items = (ytData.items || []).map((item: any) => ({ videoId: item.id?.videoId, title: item.snippet?.title || "Untitled", channel: item.snippet?.channelTitle || "YouTube", thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "", publishedAt: item.snippet?.publishedAt || "" })).filter((item: any) => item.videoId);
    return new Response(JSON.stringify({ items }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    console.error("youtube-music-search:", error);
    return new Response(JSON.stringify({ error: "Music search failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});