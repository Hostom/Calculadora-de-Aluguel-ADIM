// Conteúdo COMPLETO e CORRIGIDO para netlify/functions/indices.ts

import type { Handler, HandlerEvent } from "@netlify/functions";

// Mapeia nossos nomes simples para os códigos oficiais do Banco Central
const seriesMap = {
  igpm: '189', // IGP-M (FGV)
  inpc: '188', // INPC (IBGE)
};

const handler: Handler = async (event: HandlerEvent) => {
  const indexName = event.queryStringParameters?.name as keyof typeof seriesMap;

  // 1. Verifica se um nome de índice válido foi fornecido (igpm ou inpc)
  if (!indexName || !seriesMap[indexName]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Nome do índice inválido. Use 'igpm' ou 'inpc'." }),
    };
  }

  // 2. Monta a URL da API do Banco Central para buscar o último valor do índice
  const seriesCode = seriesMap[indexName];
  const apiUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/1?formato=json`;

  try {
    // 3. Busca os dados no Banco Central
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`A API do Banco Central respondeu com o status: ${response.status}`);
    }
    const data = await response.json();

    // 4. Extrai o valor do resultado
    // A API retorna um array, pegamos o primeiro item e a propriedade "valor"
    const latestValue = data[0]?.valor;
    if (latestValue === undefined) {
      throw new Error("Formato de resposta inesperado da API do BCB.");
    }
    
    // 5. Retorna o dado para a calculadora no mesmo formato que antes
    return {
      statusCode: 200,
      // O frontend espera uma propriedade "value" (com 'u'), então mantemos esse padrão
      body: JSON.stringify({ value: latestValue }),
    };

  } catch (error: any) {
    console.error("ERRO DETALHADO DENTRO DA FUNÇÃO:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };