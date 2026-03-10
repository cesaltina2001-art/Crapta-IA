const axios = require("axios");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', async (req, res) => {

  console.log(JSON.stringify(req.body, null, 2));

  const message =
    req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!message) {
    return res.sendStatus(200);
  }

  const from = message.from;
  const text = message.text?.body;

  if (!text) {
    return res.sendStatus(200);
  }

  console.log("Mensagem recebida:", text);

  try {

    // Enviar pergunta para a IA
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "Responde de forma clara e amigável." },
        { role: "user", content: text }
      ]
    });

    const reply = completion.choices[0].message.content;

    // Enviar resposta para WhatsApp
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Resposta enviada:", reply);

  } catch (error) {
    console.error("Erro:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
