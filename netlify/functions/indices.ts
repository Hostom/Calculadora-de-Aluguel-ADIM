import type { Handler, HandlerEvent } from "@netlify/functions";

// Mapeia nossos nomes simples para os códigos oficiais do Banco Central
const seriesMap = {
  igpm: '189', // IGP-M (FGV)
  inpc: '188', // INPC (IBGE)
};

const handler: Handler = async (event: HandlerEvent) => {
  const indexName = event.queryStringParameters?.name as keyof typeof seriesMap;

  if (!indexName || !seriesMap[indexName]) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Nome do índice inválido. Use 'igpm' ou 'inpc'." }),
    };
  }

  // 1. URL ATUALIZADA para buscar os últimos 12 valores
  const seriesCode = seriesMap[indexName];
  const apiUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/12?formato=json`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`A API do Banco Central respondeu com o status: ${response.status}`);
    }
    const data: { valor: string }[] = await response.json();

    // 2. CÁLCULO DO ACUMULADO usando .reduce()
    // Começamos com um valor inicial de 1
    const totalFactor = data.reduce((accumulator, currentItem) => {
      const monthlyValue = parseFloat(currentItem.valor); // Converte o texto para número
      // Aplica a fórmula do juro composto: (1 + 0.01) * (1 + 0.02) ...
      return accumulator * (1 + monthlyValue / 100);
    }, 1);

    // Converte o fator total de volta para um percentual
    const accumulatedValue = (totalFactor - 1) * 100;

    if (isNaN(accumulatedValue)) {
      throw new Error("Falha ao calcular o valor acumulado.");
    }
    
    // 3. Retorna o valor acumulado final para a calculadora
    return {
      statusCode: 200,
      body: JSON.stringify({ value: accumulatedValue }),
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