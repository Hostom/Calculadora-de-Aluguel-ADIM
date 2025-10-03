// VERSÃO FINAL, COMPLETA E SEM ABREVIAÇÕES - Cole em src/App.tsx

import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import './App.css';

// --- Interfaces para organizar os resultados ---
interface IContractAnalysis {
  currentRent: number;
  indexName: string;
  indexPercent: number;
  rentAdjustedByIndex: number;
}

interface IMarketAnalysis {
  valueMin: number;
  valueMax: number;
}

interface IResult {
  contractAnalysis: IContractAnalysis;
  marketAnalysis: IMarketAnalysis;
  finalProposedValue: number;
  marketAdjustment: number;
  justification: string;
}

function App() {
  // --- Estados para Análise de Reajuste Contratual ---
  const [currentRent, setCurrentRent] = useState('');
  const [selectedIndex, setSelectedIndex] = useState('igpm');
  const [marketAdjustment, setMarketAdjustment] = useState('');
  const [justification, setJustification] = useState('');

  // --- Estados para Análise de Mercado (Métrica Original) ---
  const [tipoImovel, setTipoImovel] = useState("apartamento");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [metragem, setMetragem] = useState(100);
  const [dormitorios, setDormitorios] = useState(3);
  const [suites, setSuites] = useState(1);
  const [sacada, setSacada] = useState("com churrasqueira");
  const [mobiliado, setMobiliado] = useState("mobiliado");
  const [andar, setAndar] = useState("baixo");
  const [elevador, setElevador] = useState("sim");
  const [vagas, setVagas] = useState(1);
  const [lazer, setLazer] = useState("completo");
  const [padrao, setPadrao] = useState("medio");
  const [quadra, setQuadra] = useState("1");
  const [estadoPredio, setEstadoPredio] = useState("novo");
  
  // --- Estados de Controle ---
  const [result, setResult] = useState<IResult | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [indices, setIndices] = useState<{ igpm: number; inpc: number } | null>(null);
  const [loadingIndices, setLoadingIndices] = useState(true);

  // --- EFEITO PARA BUSCAR DADOS DA API ---
  useEffect(() => {
    async function fetchIndices() {
      const seriesMap = { igpm: '189', inpc: '188' };
      const urlIgpm = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesMap.igpm}/dados/ultimos/12?formato=json`;
      const urlInpc = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesMap.inpc}/dados/ultimos/12?formato=json`;
      try {
        const [resIgpm, resInpc] = await Promise.all([ fetch(urlIgpm), fetch(urlInpc) ]);
        if (!resIgpm.ok || !resInpc.ok) throw new Error("Falha ao buscar dados do BCB");
        const igpmData = await resIgpm.json();
        const inpcData = await resInpc.json();

        const calculateAccumulated = (data: { valor: string }[]) => {
          const totalFactor = data.reduce((accumulator, currentItem) => {
            const monthlyValue = parseFloat(currentItem.valor);
            return accumulator * (1 + monthlyValue / 100);
          }, 1);
          return (totalFactor - 1) * 100;
        };
        
        setIndices({ 
          igpm: calculateAccumulated(igpmData), 
          inpc: calculateAccumulated(inpcData) 
        });

      } catch (error) {
        console.error("Erro ao buscar os índices da API:", error);
        alert("Não foi possível carregar os índices econômicos. Por favor, tente recarregar a página.");
      } finally {
        setLoadingIndices(false);
      }
    }
    fetchIndices();
  }, []);

  // --- LÓGICA E FUNÇÕES AUXILIARES ---
  const faixasCEP = {
    itajai: { inicio: "88300001", fim: "88319999" },
    camboriu: { inicio: "88340001", fim: "88349999" },
    itapema: { inicio: "88220000", fim: "88229999" },
    portoBelo: { inicio: "88210000", fim: "88214999" },
    balnearioCamboriu: { inicio: "88330001", fim: "88339999" }
  };
  const bairrosValores = {
    Centro: 0.08, Pioneiros: 0.1, "Barra Sul": 0.05, Nações: 0, Estados: -0.05,
    Municípios: -0.05, "Vila Real": -0.1, "Nova Esperança": -0.1, "Iate Clube": -0.1, Barra: -0.1,
  };

  const verificarCEP = (cep: string) => {
    const cepNumerico = cep.replace(/\D/g, "");
    if (cepNumerico.length !== 8) return false;
    return Object.values(faixasCEP).some(faixa => cepNumerico >= faixa.inicio && cepNumerico <= faixa.fim);
  };
  
  async function buscarEnderecoPorCEP(cep: string) {
    try {
      if (!verificarCEP(cep)) {
        alert("CEP não pertence às cidades de Itajaí, Camboriú, Itapema, Porto Belo ou Balneário Camboriú.");
        return;
      }
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) { alert("CEP não encontrado"); return; }
      setRua(dados.logradouro || "");
      setBairro(dados.bairro || "");
    } catch (_) {
      alert("Erro ao buscar CEP");
    }
  }

  function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novoCep = e.target.value.replace(/\D/g, "");
    setCep(novoCep);
    if (novoCep.length === 8) {
      buscarEnderecoPorCEP(novoCep);
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  // --- FUNÇÃO PRINCIPAL DE CÁLCULO ---
  const handleCalculateAnalyses = () => {
    setCalculando(true);
    const rent = parseFloat(currentRent);
    if (isNaN(rent) || rent <= 0) {
      alert('Por favor, insira um valor de aluguel atual que seja válido.');
      setCalculando(false);
      return;
    }
    if (!indices) {
      alert("Os índices ainda estão sendo carregados. Por favor, aguarde um momento.");
      setCalculando(false);
      return;
    }
    setTimeout(() => {
      // ANÁLISE 1: Reajuste Contratual
      const selectElement = document.querySelector<HTMLSelectElement>('#index-select');
      const indexName = selectElement?.selectedOptions[0].text || '';
      const indexPercent = indices[selectedIndex as keyof typeof indices];
      const rentAdjustedByIndex = rent * (1 + indexPercent / 100);
      const contractAnalysis: IContractAnalysis = { currentRent: rent, indexName, indexPercent, rentAdjustedByIndex };
      
      // ANÁLISE 2: Valor de Mercado (sua métrica)
      const valorBaseM2 = tipoImovel === "casa" ? (padrao === "alto" ? 80 : padrao === "medio" ? 50 : 35) : estadoPredio === "antigo" ? 53 : padrao === "alto" ? 90 : padrao === "medio" ? 45 : 30;
      let ajuste = 0;
      if (mobiliado === "semi") ajuste -= 0.3; else if (mobiliado === "nao") ajuste -= 0.15; else if (mobiliado === "decorado") ajuste += 0.1;
      if (sacada === "sem churrasqueira") ajuste -= 0.07; else if (sacada === "sem sacada") ajuste -= 0.1;
      if (andar === "alto") ajuste += 0.07; else if (andar === "alto_vista") ajuste += 0.12; else if (andar === "baixo_vista") ajuste += 0.05;
      if (elevador === "nao") ajuste -= 0.07;
      if (vagas === 0) ajuste -= 0.1; else if (vagas === 2) ajuste += 0.05; else if (vagas >= 3) ajuste += 0.1;
      if (lazer === "nenhum") ajuste -= 0.05; else if (lazer === "parcial") ajuste -= 0.02;
      if (padrao === "alto") ajuste += 0.15; else if (padrao === "baixo") ajuste -= 0.1;
      if (dormitorios === 1) ajuste -= 0.1; else if (dormitorios === 2) ajuste -= 0.05; else if (dormitorios >= 4) ajuste += 0.05;
      if (suites === 0) ajuste -= 0.09; else if (suites === 1) ajuste -= 0.06; else if (suites === 2) ajuste -= 0.03; else if (suites >= 4) ajuste += 0.05;
      switch (quadra) {
          case "1": ajuste += 0.1; break; case "2": ajuste += 0.075; break; case "3": ajuste += 0.05; break;
          case "4": ajuste += 0; break; case "mais": ajuste -= 0.05; break;
      }
      if (bairro && bairro in bairrosValores) {
        ajuste += bairrosValores[bairro as keyof typeof bairrosValores];
      }
      const fatorDescontoMetragem = metragem <= 100 ? 1 : 1 - 0.0032 * (metragem - 100);
      const valorBase = metragem * valorBaseM2 * fatorDescontoMetragem;
      const valorMin = valorBase * (1 + ajuste - 0.05);
      const valorMax = valorBase * (1 + ajuste + 0.05);
      const marketAnalysis: IMarketAnalysis = { valueMin: valorMin, valueMax: valorMax };

      // PROPOSTA FINAL
      const marketAdjPercent = parseFloat(marketAdjustment) || 0;
      const finalProposedValue = rentAdjustedByIndex * (1 + marketAdjPercent / 100);

      setResult({ contractAnalysis, marketAnalysis, finalProposedValue, marketAdjustment: marketAdjPercent, justification });
      setCalculando(false);
    }, 500);
  };

  // --- FUNÇÃO DE EXPORTAÇÃO DE PDF ESTILIZADA ---
  const exportarPDF = () => {
    if (!result) {
      alert("Por favor, gere uma análise antes de exportar o PDF.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = 0;

    const adimBlue = "#005a9c";
    const adimOrange = "#ef5b30";
    const textColor = "#333333";
    const grayColor = "#7f8c8d";

    // --- CABEÇALHO ---
    try {
      doc.addImage('/logo.png', 'PNG', margin, margin, 40, 25);
    } catch (e) { console.error("Erro ao adicionar a logo."); }

    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    const rightText = "adimimoveis.com.br";
    const rightTextWidth = doc.getTextWidth(rightText);
    doc.text(rightText, pageWidth - margin - rightTextWidth, margin + 10);

    currentY = margin + 35;

    // --- TÍTULO DO RELATÓRIO ---
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(adimBlue);
    doc.text("Painel de Análise para Renovação de Aluguel", pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setDrawColor(adimOrange);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 15;

    // --- DETALHES DO IMÓVEL ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor);
    doc.text("Características do Imóvel Avaliado", margin, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dadosEsquerda = [ `Endereço: ${rua || "-"}`, `Bairro: ${bairro || "-"}`, `Tipo: ${tipoImovel}`, `Metragem: ${metragem} m²`, `Dormitórios: ${dormitorios} (sendo ${suites} suítes)`, `Vagas: ${vagas}` ];
    const dadosDireita = [ `Padrão: ${padrao}`, `Mobiliado: ${mobiliado}`, `Lazer: ${lazer}`, `Andar: ${andar}`, `Sacada: ${sacada}`, `Elevador: ${elevador}` ];

    const middleX = pageWidth / 2;
    for (let i = 0; i < dadosEsquerda.length; i++) {
      doc.text(dadosEsquerda[i], margin, currentY);
      if (dadosDireita[i]) { doc.text(dadosDireita[i], middleX, currentY); }
      currentY += 6;
    }
    currentY += 10;

    // --- ANÁLISES COMPARATIVAS ---
    doc.setDrawColor(adimOrange);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(adimBlue);
    doc.text("Análise de Reajuste Contratual", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text(`Valor Atual: ${formatCurrency(result.contractAnalysis.currentRent)}`, margin + 5, currentY);
    doc.text(`Valor Corrigido (${result.contractAnalysis.indexPercent.toFixed(2)}%): ${formatCurrency(result.contractAnalysis.rentAdjustedByIndex)}`, middleX, currentY);
    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(adimBlue);
    doc.text("Análise de Valor de Mercado", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textColor);
    doc.text(`Faixa de Valor Estimada:`, margin + 5, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(`${formatCurrency(result.marketAnalysis.valueMin)} a ${formatCurrency(result.marketAnalysis.valueMax)}`, middleX, currentY);
    currentY += 15;

    // --- PROPOSTA FINAL ---
    doc.setFillColor("#f0f4f8");
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 30, 3, 3, 'F');
     
    let proposalY = currentY + 8;
    
    doc.setFontSize(10);
    doc.setTextColor(grayColor);
    doc.text("Proposta Final de Renovação:", margin + 5, currentY + 8);
     if (result.justification.trim() !== '') {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(grayColor);
      
      // O 'splitTextToSize' quebra o texto em várias linhas se for muito longo
      const justificationLines = doc.splitTextToSize(`Justificativa: ${result.justification}`, pageWidth - (margin * 2) - 10);
      doc.text(justificationLines, margin + 5, proposalY);
      proposalY += (justificationLines.length * 4) + 5; // Move a posição Y para baixo
    } else {
      proposalY += 5; // Se não tiver justificativa, só adiciona um espacinho
    } 
      // Verifica se a justificativa não está vazia e, se não estiver, a adiciona ao PDF
    if (result.justification.trim() !== '') {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(grayColor);
      
      // O 'splitTextToSize' quebra o texto em várias linhas se for muito longo
      const justificationLines = doc.splitTextToSize(`Justificativa: ${result.justification}`, pageWidth - (margin * 2) - 10);
      doc.text(justificationLines, margin + 5, proposalY);
      proposalY += (justificationLines.length * 4) + 5; // Move a posição Y para baixo
    } else {
      proposalY += 5; // Se não tiver justificativa, só adiciona um espacinho
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor("#27ae60");
    doc.text(formatCurrency(result.finalProposedValue), pageWidth / 2, currentY + 20, { align: 'center' });

    // --- RODAPÉ ---
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR");
    
    doc.setFillColor(adimOrange);
    doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor("#ffffff");
    doc.text("ADIM Imóveis - CRECI 3235J", margin, pageHeight - 8);
    doc.text(`Relatório gerado em: ${dataFormatada}`, pageWidth - margin - doc.getTextWidth(`Relatório gerado em: ${dataFormatada}`), pageHeight - 8);

    doc.save("Analise_Renovacao_ADIM.pdf");
  };

  // --- RENDERIZAÇÃO ---
  if (loadingIndices) {
    return (
      <main className="container">
        <div className="loading-container">
          <img src="/logo.png" alt="Logo ADIM" className="logo" />
          <h1>Carregando índices econômicos...</h1>
          <p>Buscando os valores acumulados mais recentes de IGP-M e INPC.</p>
        </div>
      </main>
    )
  }
  
  return (
    <main className="container">
      <header>
        <img src="/logo.png" alt="Logo ADIM" className="logo" />
        <h1>Painel de Análise de Renovação</h1>
        <p>Compare o reajuste contratual com o valor de mercado para definir a melhor proposta.</p>
      </header>

      <form>
        {/* SEÇÃO 1: DADOS DO CONTRATO ATUAL */}
        <div className="form-section">
          <h3 className="form-section-header">1. Análise de Reajuste Contratual</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="current-rent">Valor do Aluguel Atual (R$)</label>
              <input type="number" id="current-rent" placeholder="Ex: 2500.00" value={currentRent} onChange={(e) => setCurrentRent(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="index-select">Índice de Reajuste</label>
              <select id="index-select" value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)}>
                <option value="igpm">IGP-M (Acumulado 12 meses)</option>
                <option value="inpc">INPC (Acumulado 12 meses)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: CARACTERÍSTICAS DO IMÓVEL */}
        <div className="form-section">
          <h3 className="form-section-header">2. Análise de Valor de Mercado (Avaliação Detalhada)</h3>
          <div className="form-grid">
            <div className="form-group"> <label>CEP</label> <input value={cep} onChange={handleCepChange} maxLength={8} placeholder="Apenas números"/> </div>
            <div className="form-group"> <label>Rua</label> <input value={rua} readOnly placeholder="Automático"/> </div>
            <div className="form-group"> <label>Bairro</label> <input value={bairro} readOnly placeholder="Automático"/> </div>
            <div className="form-group"> <label>Metragem (m²)</label> <input type="number" value={metragem} onChange={(e) => setMetragem(Number(e.target.value))} /> </div>
            <div className="form-group"> <label>Tipo de imóvel</label> <select value={tipoImovel} onChange={(e) => setTipoImovel(e.target.value)}> <option value="apartamento">Apartamento</option> <option value="casa">Casa</option> </select> </div>
            <div className="form-group"> <label>Dormitórios</label> <input type="number" value={dormitorios} onChange={(e) => setDormitorios(Number(e.target.value))} /> </div>
            <div className="form-group"> <label>Suítes</label> <input type="number" value={suites} onChange={(e) => setSuites(Number(e.target.value))} /> </div>
            <div className="form-group"> <label>Sacada</label> <select value={sacada} onChange={(e) => setSacada(e.target.value)}> <option value="com churrasqueira">Com churrasqueira</option> <option value="sem churrasqueira">Sem churrasqueira</option> <option value="sem sacada">Sem sacada</option> </select> </div>
            <div className="form-group"> <label>Mobiliado</label> <select value={mobiliado} onChange={(e) => setMobiliado(e.target.value)}> <option value="mobiliado">Mobiliado</option> <option value="semi">Semi-mobiliado</option> <option value="nao">Não mobiliado</option> <option value="decorado">Decorado</option> </select> </div>
            <div className="form-group"> <label>Andar</label> <select value={andar} onChange={(e) => setAndar(e.target.value)}> <option value="baixo">Baixo</option> <option value="alto">Alto</option> <option value="alto_vista">Alto com vista</option> <option value="baixo_vista">Baixo com vista</option> </select> </div>
            <div className="form-group"> <label>Elevador</label> <select value={elevador} onChange={(e) => setElevador(e.target.value)}> <option value="sim">Sim</option> <option value="nao">Não</option> </select> </div>
            <div className="form-group"> <label>Vagas</label> <input type="number" value={vagas} onChange={(e) => setVagas(Number(e.target.value))} /> </div>
            <div className="form-group"> <label>Lazer</label> <select value={lazer} onChange={(e) => setLazer(e.target.value)}> <option value="completo">Completo</option> <option value="parcial">Parcial</option> <option value="nenhum">Nenhum</option> </select> </div>
            <div className="form-group"> <label>Padrão</label> <select value={padrao} onChange={(e) => setPadrao(e.target.value)}> <option value="alto">Alto</option> <option value="medio">Médio</option> <option value="baixo">Baixo</option> </select> </div>
            <div className="form-group"> <label>Quadra</label> <select value={quadra} onChange={(e) => setQuadra(e.target.value)}> <option value="1">1ª quadra</option> <option value="2">2ª quadra</option> <option value="3">3ª quadra</option> <option value="4">4ª quadra</option> <option value="mais">Mais distante</option> </select> </div>
            <div className="form-group"> <label>Estado do prédio</label> <select value={estadoPredio} onChange={(e) => setEstadoPredio(e.target.value)}> <option value="novo">Novo</option> <option value="antigo">Antigo</option> </select> </div>
          </div>
        </div>
        
        {/* SEÇÃO 3: PROPOSTA FINAL */}
        <div className="form-section">
            <h3 className="form-section-header">3. Definição da Proposta de Negociação</h3>
            <div className="form-group market-adjustment">
              <label htmlFor="market-adjustment">Ajuste (%) sobre o Valor Corrigido pelo Índice</label>
              <input type="number" id="market-adjustment" placeholder="Ex: 5 ou -2.5" value={marketAdjustment} onChange={(e) => setMarketAdjustment(e.target.value)}/>
              <small>Use este campo para chegar ao valor final desejado.</small>
            </div>
            <div className="form-group">
              <label htmlFor="justification">Justificativa para a Proposta (Opcional)</label>
              <textarea id="justification" rows={3} placeholder="Ex: Ajuste para alinhar com o valor de mercado atual da região, que está entre X e Y." value={justification} onChange={(e) => setJustification(e.target.value)}></textarea>
            </div>
        </div>

        <div className="buttons-container">
          <button type="button" className="btn-primary" onClick={handleCalculateAnalyses} disabled={calculando}>
            {calculando ? "Calculando..." : "Gerar Análises"}
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPDF} disabled={!result}>
            Exportar Relatório PDF
          </button>
        </div>
      </form>
      
      {result && (
        <section id="result-container">
          <h2>Análises Comparativas</h2>
          <div className="result-grid">
            <div className="result-card">
              <h3 className="result-card-header">Análise Contratual (Reajuste)</h3>
              <div className="result-item"><span>Valor Atual:</span><strong>{formatCurrency(result.contractAnalysis.currentRent)}</strong></div>
              <div className="result-item"><span>Índice ({result.contractAnalysis.indexName}):</span><strong>{result.contractAnalysis.indexPercent.toFixed(2)}%</strong></div>
              <div className="result-item highlight"><span>Valor Corrigido pelo Índice:</span><strong>{formatCurrency(result.contractAnalysis.rentAdjustedByIndex)}</strong></div>
            </div>
            <div className="result-card">
              <h3 className="result-card-header">Análise de Mercado (Avaliação)</h3>
              <div className="result-item"><span>Baseado nas características do imóvel:</span><span></span></div>
              <div className="result-item highlight"><span>Valor de Mercado Estimado:</span><strong>{formatCurrency(result.marketAnalysis.valueMin)} a {formatCurrency(result.marketAnalysis.valueMax)}</strong></div>
            </div>
          </div>

          <div className="final-proposal-section">
            <p>Com base no valor corrigido de <strong>{formatCurrency(result.contractAnalysis.rentAdjustedByIndex)}</strong> e um ajuste proposto de <strong>{result.marketAdjustment.toFixed(2)}%</strong>:</p>
            {result.justification.trim() !== '' && (
              <div className="justification-display"><strong>Justificativa:</strong><p>{result.justification}</p></div>
            )}
            <div className="final-value"><span>NOVO VALOR PROPOSTO: {formatCurrency(result.finalProposedValue)}</span></div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;