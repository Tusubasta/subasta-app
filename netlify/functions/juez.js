// Proxy hacia Gemini: la API key vive sólo en el servidor (variable de entorno
// de Netlify), nunca en el código que llega al navegador.
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta GEMINI_API_KEY en las variables de entorno de Netlify." }),
    };
  }

  let prompt, system;
  try {
    ({ prompt, system } = JSON.parse(event.body || "{}"));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Body inválido" }) };
  }
  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: "Falta 'prompt'" }) };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: { temperature: 1, maxOutputTokens: 1200 },
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: "Gemini rechazó el pedido", detalle }) };
    }

    const data = await res.json();
    const texto =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
