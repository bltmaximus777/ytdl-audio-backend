export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get("url") || "https://www.youtube.com/watch?v=h4xDaP2EiuU";
  
  try {
    const resp = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const html = await resp.text();
    const playerMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});(?:\s*var\s+|\s*<\/script>)/s)
      || html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
      
    if (!playerMatch) {
      return new Response(JSON.stringify({ error: "Could not find ytInitialPlayerResponse" }), { status: 400 });
    }
    
    const pr = JSON.parse(playerMatch[1]);
    const streamingData = pr.streamingData || {};
    const formats = (streamingData.formats || []).concat(streamingData.adaptiveFormats || []);
    
    return new Response(JSON.stringify({
      keys: formats.length > 0 ? Object.keys(formats[0]) : [],
      sample_format: formats.length > 0 ? formats[0] : null
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
