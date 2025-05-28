export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, edad, peso, altura, genero, nivelActividad, objetivo, tmb, calorias } = req.body;

    if (!nombre || !edad || !peso || !altura || !tmb || !calorias) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'API Key no configurada' });
    }

    const prompt = `
    Crea un plan nutricional personalizado para:
    - Nombre: ${nombre}
    - Edad: ${edad} años
    - Peso: ${peso} kg
    - Altura: ${altura} cm
    - Género: ${genero}
    - Nivel de actividad: ${nivelActividad}
    - Objetivo: ${objetivo}
    - TMB: ${tmb} kcal/día
    - Calorías diarias recomendadas: ${calorias} kcal/día

    Proporciona:
    1. Distribución de macronutrientes (proteínas, carbohidratos, grasas) en gramos y porcentajes
    2. Plan de 5 comidas del día con ejemplos específicos y porciones
    3. Lista de alimentos recomendados
    4. Recomendaciones de hidratación
    5. Consejos específicos para alcanzar el objetivo

    Formato: Texto claro, estructurado con títulos y fácil de leer.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Eres un nutricionista experto que crea planes nutricionales personalizados, detallados y fáciles de seguir.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error de OpenAI:', error);
      return res.status(500).json({ error: 'Error al generar el plan' });
    }

    const data = await response.json();
    const plan = data.choices[0].message.content;

    return res.status(200).json({ plan });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error al generar el plan nutricional',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}