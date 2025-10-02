document.addEventListener('DOMContentLoaded', function() {
    
    // ATENÇÃO: Os valores abaixo são exemplos ilustrativos.
    // Para uso real, você deve pesquisar os valores acumulados oficiais dos índices
    // para os 12 meses anteriores à data de reajuste do contrato.
    // Data da consulta para estes exemplos: 02 de Outubro de 2025.
    const predefinedIndices = {
        igpm: -0.47,  // Valor hipotético do IGP-M
        ipca: 3.99,   // Valor hipotético do IPCA
        ivar: 0.76,   // Valor hipotético do IVAR
    };

    // --- ELEMENTOS DO DOM (referências aos itens do HTML) ---
    const renewalForm = document.getElementById('renewal-form');
    const indexSelect = document.getElementById('index-select');
    const customPercentGroup = document.getElementById('custom-percent-group');
    const calculateButton = document.getElementById('calculate-button');
    const clearButton = document.getElementById('clear-button');
    const resultContainer = document.getElementById('result-container');
    const resultDetails = document.getElementById('result-details');

    // --- MANIPULADORES DE EVENTOS (o que acontece quando o usuário interage) ---

    // Mostra ou esconde o campo de percentual personalizado
    indexSelect.addEventListener('change', () => {
        if (indexSelect.value === 'custom') {
            customPercentGroup.style.display = 'block';
        } else {
            customPercentGroup.style.display = 'none';
        }
    });

    // Ação do botão "Gerar Proposta"
    calculateButton.addEventListener('click', generateProposal);

    // Ação do botão "Limpar"
    clearButton.addEventListener('click', clearFields);

    // --- FUNÇÕES PRINCIPAIS ---

    /**
     * Formata um número para o padrão de moeda brasileiro (R$).
     * @param {number} value - O número a ser formatado.
     * @returns {string} - O valor formatado como moeda.
     */
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    /**
     * Pega os dados do formulário, calcula e exibe a proposta de reajuste.
     */
    function generateProposal() {
        // 1. Obter valores dos campos do formulário
        const currentRent = parseFloat(document.getElementById('current-rent').value);
        const selectedIndex = indexSelect.value;
        const marketAdjustment = parseFloat(document.getElementById('market-adjustment').value) || 0;
        const justification = document.getElementById('justification').value;

        // 2. Validar a entrada principal (valor do aluguel)
        if (isNaN(currentRent) || currentRent <= 0) {
            alert('Por favor, insira um valor de aluguel atual que seja válido.');
            return; // Interrompe a função se o valor for inválido
        }

        // 3. Determinar o percentual do índice a ser usado
        let indexPercent = 0;
        if (selectedIndex === 'custom') {
            const customPercent = parseFloat(document.getElementById('custom-percent').value);
            if (isNaN(customPercent)) {
                alert('Por favor, insira um percentual personalizado válido.');
                return; // Interrompe se o índice for personalizado mas estiver vazio/inválido
            }
            indexPercent = customPercent;
        } else {
            indexPercent = predefinedIndices[selectedIndex];
        }

        // 4. Realizar os cálculos
        const rentAdjustedByIndex = currentRent * (1 + indexPercent / 100);
        const finalRent = rentAdjustedByIndex * (1 + marketAdjustment / 100);

        // 5. Montar o HTML que será exibido como resultado
        let htmlResult = `
            <div class="result-item">
                <span>Valor do Aluguel Atual:</span>
                <strong>${formatCurrency(currentRent)}</strong>
            </div>
            <div class="result-item">
                <span>Índice Aplicado (${indexSelect.options[indexSelect.selectedIndex].text}):</span>
                <strong>${indexPercent.toFixed(2)}%</strong>
            </div>
            <div class="result-item">
                <span>Valor Corrigido pelo Índice:</span>
                <strong>${formatCurrency(rentAdjustedByIndex)}</strong>
            </div>
            <div class="result-item">
                <span>Ajuste de Mercado Proposto:</span>
                <strong>${marketAdjustment.toFixed(2)}%</strong>
            </div>
        `;
        
        if (justification.trim() !== '') {
            htmlResult += `
                <div class="justification-display">
                    <strong>Justificativa:</strong>
                    <p>${justification}</p>
                </div>
            `;
        }
        
        htmlResult += `
            <div class="final-value">
                <span>NOVO VALOR PROPOSTO: ${formatCurrency(finalRent)}</span>
            </div>
        `;

        // 6. Exibir o container de resultados com as informações calculadas
        resultDetails.innerHTML = htmlResult;
        resultContainer.classList.remove('hidden');
    }

    /**
     * Limpa todos os campos do formulário e esconde os resultados.
     */
    function clearFields() {
        renewalForm.reset();
        customPercentGroup.style.display = 'none';
        resultContainer.classList.add('hidden');
        resultDetails.innerHTML = '';
    }
});
