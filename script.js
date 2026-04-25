// Configuração do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Variáveis globais
let pdfDoc = null;
let pageTexts = [];     // Armazena o texto de cada página
let totalPages = 0;
let isIndexed = false;

// Elementos DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const progressBar = document.getElementById('progressBar');
const statusMsg = document.getElementById('statusMsg');

// Nome do arquivo PDF (deve estar no mesmo diretório)
const PDF_PATH = 'teoria-das-janelas-quebradas.pdf';

// ============================================
// 1. Carregar e indexar o PDF ao iniciar
// ============================================
async function loadAndIndexPDF() {
    showLoading(true);
    statusMsg.innerText = '📖 Carregando o livro...';
    
    try {
        // Carrega o documento PDF
        const loadingTask = pdfjsLib.getDocument(PDF_PATH);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        
        statusMsg.innerText = `📄 Livro carregado! Indexando ${totalPages} páginas...`;
        showProgressBar(true);
        
        // Extrai texto de cada página
        pageTexts = [];
        
        for (let i = 1; i <= totalPages; i++) {
            // Atualiza progresso
            const percent = (i / totalPages) * 100;
            document.querySelector('.progress-fill').style.width = `${percent}%`;
            statusMsg.innerText = `🔍 Indexando página ${i} de ${totalPages}...`;
            
            // Extrai texto da página
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            
            pageTexts.push({
                pageNum: i,
                text: pageText
            });
        }
        
        isIndexed = true;
        statusMsg.innerText = '✅ Livro indexado com sucesso! Digite sua busca acima.';
        showLoading(false);
        showProgressBar(false);
        
        // Mostra mensagem de boas-vindas
        mostrarBoasVindas();
        
    } catch (error) {
        console.error('Erro ao carregar PDF:', error);
        statusMsg.innerText = '❌ Erro ao carregar o livro. Verifique se o arquivo PDF está no servidor.';
        showLoading(false);
        showProgressBar(false);
        
        // Mensagem de erro visível
        resultsDiv.innerHTML = `
            <div class="sem-resultados">
                <div class="icone">⚠️</div>
                <h3>Erro ao carregar o livro</h3>
                <p>O arquivo "teoria-das-janelas-quebradas.pdf" não foi encontrado.</p>
                <p>Certifique-se de que ele está no mesmo diretório que esta página.</p>
            </div>
        `;
    }
}

// ============================================
// 2. Função de busca dentro do texto indexado
// ============================================
function buscarNoLivro(termoBusca) {
    if (!isIndexed) {
        resultsDiv.innerHTML = `
            <div class="sem-resultados">
                <div class="icone">⏳</div>
                <h3>Aguarde...</h3>
                <p>O livro ainda está sendo carregado. Tente novamente em alguns segundos.</p>
            </div>
        `;
        return [];
    }
    
    if (!termoBusca || termoBusca.trim().length < 2) {
        return [];
    }
    
    const termo = termoBusca.trim().toLowerCase();
    
    // Busca em cada página e calcula relevância
    const resultados = [];
    
    for (let i = 0; i < pageTexts.length; i++) {
        const pagina = pageTexts[i];
        const textoLower = pagina.text.toLowerCase();
        
        // Conta quantas vezes o termo aparece
        let ocorrencias = 0;
        let pos = -1;
        while ((pos = textoLower.indexOf(termo, pos + 1)) !== -1) {
            ocorrencias++;
        }
        
        if (ocorrencias > 0) {
            // Extrai contexto (trecho ao redor da primeira ocorrência)
            const primeiraPos = textoLower.indexOf(termo);
            const inicio = Math.max(0, primeiraPos - 200);
            const fim = Math.min(pagina.text.length, primeiraPos + 300);
            let contexto = pagina.text.substring(inicio, fim);
            
            // Marca o termo em destaque (para exibição)
            const regex = new RegExp(`(${termoBusca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const contextoDestacado = contexto.replace(regex, '<mark>$1</mark>');
            
            resultados.push({
                pagina: pagina.pageNum,
                ocorrencias: ocorrencias,
                contexto: contextoDestacado,
                textoCompleto: pagina.text
            });
        }
    }
    
    // Ordena por número de ocorrências (mais relevante primeiro)
    resultados.sort((a, b) => b.ocorrencias - a.ocorrencias);
    
    return resultados;
}

// ============================================
// 3. Exibir resultados na tela
// ============================================
function exibirResultados(termo) {
    if (!termo || termo.trim().length < 2) {
        resultsDiv.innerHTML = `
            <div class="sem-resultados">
                <div class="icone">🔍</div>
                <h3>Digite um termo para buscar</h3>
                <p>Use palavras como: síndico, assembleia, reserva, Porto Velho</p>
            </div>
        `;
        return;
    }
    
    statusMsg.innerText = `🔎 Buscando por "${termo}"...`;
    
    const resultados = buscarNoLivro(termo);
    
    if (resultados.length === 0) {
        resultsDiv.innerHTML = `
            <div class="sem-resultados">
                <div class="icone">😕</div>
                <h3>Nenhum resultado encontrado</h3>
                <p>Não encontramos "<strong>${termo.replace(/</g, '&lt;')}</strong>" no livro.</p>
                <p>Tente outras palavras ou verifique a ortografia.</p>
                <p><small>Exemplos: janela quebrada, cheque especial, conselho fiscal, Porto Velho</small></p>
            </div>
        `;
        statusMsg.innerText = `❌ Nenhum resultado para "${termo}"`;
        return;
    }
    
    statusMsg.innerText = `✅ Encontrado(s) ${resultados.length} resultado(s) para "${termo}"`;
    
    // Monta o HTML dos resultados
    let html = '';
    resultados.forEach((res, idx) => {
        html += `
            <div class="resultado-item">
                <div class="resultado-header">
                    <span class="resultado-pagina">📄 Página ${res.pagina}</span>
                    <span class="resultado-score">🔎 ${res.ocorrencias} ocorrência(s)</span>
                </div>
                <div class="resultado-conteudo">
                    ${res.contexto}
                </div>
                <div class="ver-mais">
                    <a href="${PDF_PATH}#page=${res.pagina}" target="_blank">📖 Ver na página ${res.pagina}</a>
                </div>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = html;
}

// ============================================
// 4. Funções auxiliares (UI)
// ============================================
function showLoading(show) {
    if (show) {
        loadingDiv.classList.remove('hidden');
    } else {
        loadingDiv.classList.add('hidden');
    }
}

function showProgressBar(show) {
    if (show) {
        progressBar.classList.remove('hidden');
    } else {
        progressBar.classList.add('hidden');
    }
}

function mostrarBoasVindas() {
    resultsDiv.innerHTML = `
        <div class="sem-resultados">
            <div class="icone">📚</div>
            <h3>Bem-vindo à busca inteligente!</h3>
            <p><strong>${totalPages}</strong> páginas indexadas e prontas para consulta.</p>
            <p>Digite qualquer palavra ou assunto no campo acima e encontre trechos exatos do livro.</p>
            <hr style="margin: 20px 0; border-color: #e0e0e0;">
            <p style="font-size: 0.85rem;">💡 <strong>Sugestões de busca:</strong><br>
            "janela quebrada" • "cheque especial" • "Porto Velho" • "conselho fiscal" • "depreciação"</p>
        </div>
    `;
}

// ============================================
// 5. Eventos
// ============================================
searchBtn.addEventListener('click', () => {
    const termo = searchInput.value;
    exibirResultados(termo);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        exibirResultados(searchInput.value);
    }
});

// ============================================
// 6. Inicialização
// ============================================
// Carrega o PDF assim que a página abre
loadAndIndexPDF();
