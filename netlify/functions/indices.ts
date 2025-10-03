// Conteúdo para netlify/functions/indices.ts

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const indexName = event.queryStringParameters?.name;
  const apiKey = process.env.VITE_DEBIT_API_KEY;

  if (!indexName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Nome do índice não fornecido (ex: ?name=igpm)" }),
    };
  }
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API Key não configurada no ambiente." }),
    };
  }

  const apiUrl = `https://api.debit.com.br/v2/index-series/${indexName}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Api-Key': apiKey, // Adiciona a chave da API no header
      },
    });

    if (!response.ok) {
      throw new Error(`A API da DEBIT respondeu com o status: ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error: any) {
  console.error("ERRO DETALHADO DENTRO DA FUNÇÃO:", error); // <-- ADICIONE ESTA LINHA
  return {
    statusCode: 502, // Bad Gateway
    body: JSON.stringify({ error: error.message }),
  };
}
};

export { handler };