import { useState } from 'react';
import { jsPDF } from 'jspdf';
import './App.css';

function App() {
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
  const [valorFinalMin, setValorFinalMin] = useState<string | null>(null);
  const [valorFinalMax, setValorFinalMax] = useState<string | null>(null);
  const [calculando, setCalculando] = useState(false);

  // Removida a mensagem de atratividade conforme solicitado

  // Faixas de CEP das cidades
  const faixasCEP = {
    itajai: { inicio: "88300001", fim: "88319999" },
    camboriu: { inicio: "88340001", fim: "88349999" },
    itapema: { inicio: "88220000", fim: "88229999" },
    portoBelo: { inicio: "88210000", fim: "88214999" },
    balnearioCamboriu: { inicio: "88330001", fim: "88339999" }
  };

  const bairrosValores = {
    Centro: 0.08,
    Pioneiros: 0.1,
    "Barra Sul": 0.05,
    Nações: 0,
    Estados: -0.05,
    Municípios: -0.05,
    "Vila Real": -0.1,
    "Nova Esperança": -0.1,
    "Iate Clube": -0.1,
    Barra: -0.1,
  };

  // Verificar se o CEP está dentro das faixas permitidas
  const verificarCEP = (cep: string) => {
    const cepNumerico = cep.replace(/\D/g, "");
    
    if (cepNumerico.length !== 8) return false;
    
    return (
      (cepNumerico >= faixasCEP.itajai.inicio && cepNumerico <= faixasCEP.itajai.fim) ||
      (cepNumerico >= faixasCEP.camboriu.inicio && cepNumerico <= faixasCEP.camboriu.fim) ||
      (cepNumerico >= faixasCEP.itapema.inicio && cepNumerico <= faixasCEP.itapema.fim) ||
      (cepNumerico >= faixasCEP.portoBelo.inicio && cepNumerico <= faixasCEP.portoBelo.fim) ||
      (cepNumerico >= faixasCEP.balnearioCamboriu.inicio && cepNumerico <= faixasCEP.balnearioCamboriu.fim)
    );
  };

  async function buscarEnderecoPorCEP(cep: string) {
    try {
      if (!verificarCEP(cep)) {
        alert("CEP não pertence às cidades de Itajaí, Camboriú, Itapema, Porto Belo ou Balneário Camboriú.");
        return;
      }

      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();

      if (dados.erro) {
        alert("CEP não encontrado");
        return;
      }

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

  const calcularValor = () => {
    setCalculando(true);
    setTimeout(() => {
      const valorBaseM2 = tipoImovel === "casa"
        ? (padrao === "alto" ? 80 : padrao === "medio" ? 50 : 35)
          : estadoPredio === "antigo"
          ? 53
          : padrao === "alto"
          ? 90
          : padrao === "medio"
          ? 45
          : 30;
     
    
      let ajuste = 0;

      if (mobiliado === "semi") ajuste -= 0.3;
      else if (mobiliado === "nao") ajuste -= 0.15;
      else if (mobiliado === "decorado") ajuste += 0.1;
    
      if (sacada === "sem churrasqueira") ajuste -= 0.07;
      else if (sacada === "sem sacada") ajuste -= 0.1;

      if (andar === "alto") ajuste += 0.07;
      else if (andar === "alto_vista") ajuste += 0.12;
      else if (andar === "baixo_vista") ajuste += 0.05;

      if (elevador === "nao") ajuste -= 0.07;

      if (vagas === 0) ajuste -= 0.1;
      else if (vagas === 2) ajuste += 0.05;
      else if (vagas >= 3) ajuste += 0.1;

      if (lazer === "nenhum") ajuste -= 0.05;
      else if (lazer === "parcial") ajuste -= 0.02;

      if (padrao === "alto") ajuste += 0.15;
      else if (padrao === "baixo") ajuste -= 0.1;

      if (dormitorios === 1) ajuste -= 0.1;
      else if (dormitorios === 2) ajuste -= 0.05;
      else if (dormitorios >= 4) ajuste += 0.05;

      if (suites === 0) ajuste -= 0.09;
      else if (suites === 1) ajuste -= 0.06;
      else if (suites === 2) ajuste -= 0.03;
      else if (suites >= 4) ajuste += 0.05;

      switch (quadra) {
        case "1":
          ajuste += 0.1;
          break;
        case "2":
          ajuste += 0.075;
          break;
        case "3":
          ajuste += 0.05;
          break;
        case "4":
          ajuste += 0;
          break;
        case "mais":
          ajuste -= 0.05;
          break;
      }

      if (bairro && bairro in bairrosValores) {
        ajuste += bairrosValores[bairro as keyof typeof bairrosValores];
      }

      const fatorDescontoMetragem = metragem <= 100 ? 1 : 1 - 0.0032 * (metragem - 100);
      const valorBase = metragem * valorBaseM2 * fatorDescontoMetragem;
      const valorMin = valorBase * (1 + ajuste - 0.05);
      const valorMax = valorBase * (1 + ajuste + 0.05);

      setValorFinalMin(valorMin.toFixed(2));
      setValorFinalMax(valorMax.toFixed(2));

      setCalculando(false);
    }, 500);
  };

  

  const exportarPDF = () => {
  if (!valorFinalMin || !valorFinalMax) {
    alert("Calcule o valor antes de exportar.");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageheight = doc.internal.pageSize.getHeight();
  const marginLeft = 20;

   const marginX = 20;
   let currentY = 65;
  const orange: [number, number, number] = [239, 91, 48]; // R=214, G=74, B=32

  // Faixa laranja no topo
doc.setFillColor(239, 91, 48);
doc.rect(0, 0, pageWidth, 10, "F");
currentY = 15;

  // ✅ Adicionar a logo no topo direito, com proporção correta
  try {
    const logoWidth = 40;
    const logoHeight = 24.7; // proporcional a 2048x1265
    doc.addImage('/logo.png', 'PNG', pageWidth - logoWidth - 15, 12, logoWidth, logoHeight);

  } catch (error) {
    console.warn("Logo não encontrada ou erro ao carregar.");
  }

  currentY += 30; // Espaço após a logo

  // ✅ Título
  doc.setFontSize(18);
 doc.setFont("helvetica", "bold");
 doc.setTextColor(239, 91, 48);
 doc.text("Simulação de Aluguel - Balneário Camboriú", marginLeft, currentY);
 currentY += 8;

 doc.setDrawColor(239, 91, 48);
 doc.setLineWidth(0.8);
 doc.line(marginX, currentY, pageWidth - marginX, currentY);
  currentY += 15;


  // ✅ Informações do imóvel
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  const dadosEsquerda = [
"Endereço: " + (rua || "-"),
"CEP: " + (cep || "-"),
"Dormitórios: " + dormitorios,
"Sacada: " + sacada,
"Andar: " + andar,
"Vagas: " + vagas,
"Padrão: " + padrao,
"Estado do prédio: " + estadoPredio
];

const dadosDireita = [
"Bairro: " + (bairro || "-"),
"Área: " + metragem + " m²",
"Suítes: " + suites,
"Mobiliado: " + mobiliado,
"Elevador: " + elevador,
"Lazer: " + lazer,
"Quadra: " + quadra,
"Tipo: " + tipoImovel
];

  const leftColumnX = marginLeft;
const rightColumnX = marginLeft + 70; // ajuste a distância entre as colunas conforme necessário

for (let i = 0; i < dadosEsquerda.length; i++) {
doc.text(dadosEsquerda[i], leftColumnX, currentY);
doc.text(dadosDireita[i], rightColumnX, currentY);
currentY += 7;
}

   // 5. Caixa de valor estimado
  const caixaHeight = 20; 
  const caixaWidth = pageWidth - 2 * marginX;

  doc.setDrawColor(239, 91, 48);
  doc.setFillColor(255, 245, 240);
  doc.roundedRect(marginX, currentY, caixaWidth, caixaHeight, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(239, 91, 48);
  doc.text(
    `Valor estimado: R$ ${valorFinalMin} a R$ ${valorFinalMax} mensais`,
    marginX + 5,
    currentY + 13
  );

  currentY += caixaHeight + 15;


  // ✅ Data da simulação
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR");

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(`Simulação realizada em: ${dataFormatada}`, marginLeft, currentY);
  currentY += 10;
 
  // 7. Rodapé laranja com assinatura
  doc.setFillColor(239, 91, 48);
doc.rect(0, pageheight - 15, pageWidth, 15, "F");

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(255);
doc.text("ADIM Aluguéis - CRECI 3235 J", marginX, pageheight - 5);


  // ✅ Assinatura
  doc.setFont("helvetica", "bold");
  doc.text("ADIM Aluguéis - CRECI 3235 J", marginLeft, currentY);

  doc.save("simulacao-aluguel.pdf");
};

  return (
    <div className="app-container">
      <div className="logo-container">
        <img src="/logo.png" alt="ADIM Aluguéis" className="logo" />
      </div>
      
      <div className="calculator-container">
        <h1 className="title">Simulador de Aluguel</h1>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="cep">CEP</label>
            <input
              id="cep"
              value={cep}
              onChange={handleCepChange}
              maxLength={8}
              placeholder="Digite o CEP"
            />
          </div>
          <div className="form-group">
            <label htmlFor="rua">Rua</label>
            <input id="rua" value={rua} readOnly />
          </div>
          <div className="form-group">
            <label htmlFor="bairro">Bairro</label>
            <input id="bairro" value={bairro} readOnly />
          </div>
          <div className="form-group">
            <label htmlFor="metragem">Metragem (m²)</label>
            <input
              id="metragem"
              type="number"
              value={metragem}
              min={0}
              max={9999}
              onChange={(e) => setMetragem(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="tipoImovel">Tipo de imóvel</label>
            <select
              id="tipoImovel"
              value={tipoImovel}
              onChange={(e) => setTipoImovel(e.target.value)}
            >
              <option value="apartamento">Apartamento</option>
              <option value="casa">Casa</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dormitorios">Dormitórios</label>
            <input
              id="dormitorios"
              type="number"
              value={dormitorios}
              min={0}
              max={999}
              onChange={(e) => setDormitorios(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="suites">Suítes</label>
            <input
              id="suites"
              type="number"
              value={suites}
              min={0}
              max={999}
              onChange={(e) => setSuites(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sacada">Sacada</label>
            <select
              id="sacada"
              value={sacada}
              onChange={(e) => setSacada(e.target.value)}
            >
              <option value="com churrasqueira">Com churrasqueira</option>
              <option value="sem churrasqueira">Sem churrasqueira</option>
              <option value="sem sacada">Sem sacada</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mobiliado">Mobiliado</label>
            <select
              id="mobiliado"
              value={mobiliado}
              onChange={(e) => setMobiliado(e.target.value)}
            >
              <option value="mobiliado">Mobiliado</option>
              <option value="semi">Semi-mobiliado</option>
              <option value="nao">Não mobiliado</option>
              <option value="decorado">Decorado</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="andar">Andar</label>
            <select
              id="andar"
              value={andar}
              onChange={(e) => setAndar(e.target.value)}
            >
              <option value="baixo">Baixo</option>
              <option value="alto">Alto</option>
              <option value="alto_vista">Alto com vista</option>
              <option value="baixo_vista">Baixo com vista</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="elevador">Elevador</label>
            <select
              id="elevador"
              value={elevador}
              onChange={(e) => setElevador(e.target.value)}
            >
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="vagas">Vagas</label>
            <input
              id="vagas"
              type="number"
              value={vagas}
              min={0}
              max={999}
              onChange={(e) => setVagas(Number(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lazer">Lazer</label>
            <select
              id="lazer"
              value={lazer}
              onChange={(e) => setLazer(e.target.value)}
            >
              <option value="completo">Completo</option>
              <option value="parcial">Parcial</option>
              <option value="nenhum">Nenhum</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="padrao">Padrão</label>
            <select
              id="padrao"
              value={padrao}
              onChange={(e) => setPadrao(e.target.value)}
            >
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="baixo">Baixo</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="quadra">Quadra</label>
            <select
              id="quadra"
              value={quadra}
              onChange={(e) => setQuadra(e.target.value)}
            >
              <option value="1">1ª quadra</option>
              <option value="2">2ª quadra</option>
              <option value="3">3ª quadra</option>
              <option value="4">4ª quadra</option>
              <option value="mais">Mais distante</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="estadoPredio">Estado do prédio</label>
            <select
              id="estadoPredio"
              value={estadoPredio}
              onChange={(e) => setEstadoPredio(e.target.value)}
            >
              <option value="novo">Novo</option>
              <option value="antigo">Antigo</option>
            </select>
          </div>
        </div>

        <div className="button-group">
          <button 
            className="btn btn-calcular" 
            onClick={calcularValor} 
            disabled={calculando}
          >
            {calculando ? "Calculando..." : "Calcular Valor"}
          </button>
          <button 
            className="btn btn-exportar" 
            onClick={exportarPDF}
          >
            Exportar PDF
          </button>
        </div>

        {valorFinalMin && valorFinalMax && (
          <div className="result-container">
            <p>
              Valor estimado para aluguel: {" "}
              <strong>
                R$ {valorFinalMin} a R$ {valorFinalMax} por mês
              </strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
