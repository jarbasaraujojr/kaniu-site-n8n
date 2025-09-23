    <script>
        const cachedData = {};

        async function fetchTabData(tabId) {
            if (cachedData[tabId]) {
                return;
            }

            const tabContentElement = document.getElementById('tab-' + tabId);
            tabContentElement.innerHTML = '<div class="loading-message">Carregando...</div>';

            try {
                const payload = {
                    tab_name: tabId,
                    animal_id: '${animal.animal_id}'
                };

                const response = await fetch("https://karah-n8n.uzd6db.easypanel.host/webhook/kaniu-animal-dados", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error('Erro na resposta da rede: ' + response.statusText);
                }

                const data = await response.json();
                
                // Trata a resposta do endpoint que agora retorna JSON com 'items' ou 'error'
                if (data.error) {
                    tabContentElement.innerHTML = '<div class="no-data-message">' + data.error + '</div>';
                } else if (data.items) {
                    // Mapeamento de chaves para títulos de coluna amigáveis
                    const columnMappings = {
                        'eventos': {
                            'data': 'Data', 'tipo': 'Tipo', 'descricao': 'Descrição', 'veterinario_nome': 'Veterinário'
                        },
                        'pesagens': {
                            'data': 'Data', 'peso': 'Medição', 'variacao': 'Variação'
                        },
                        'avaliacoes': {
                            'data': 'Data', 'observacao': 'Observação', 'veterinario_nome': 'Veterinário', 'temperatura': 'Temp.', 'score': 'Score', 'peso': 'Peso', 'nota': 'Nota'
                        },
                        'imunizacoes': {
                            'data_exibicao': 'Data', 'tipo': 'Tipo', 'nome_imunizante': 'Imunizante', 'veterinario_nome': 'Veterinário', 'aplicada': 'Aplicada'
                        },
                        'tratamentos': {
                            'data': 'Data', 'veterinario_nome': 'Veterinário', 'medicamentos': 'Medicamentos', 'finalizada': 'Finalizado'
                        },
                        'arquivos': {
                            'data': 'Data', 'nome': 'Nome', 'observacao': 'Observação', 'url': 'Visualizar'
                        }
                    };

                    const excludedKeys = ['id', 'animal_id', 'veterinario_id', 'concluido', 'programado', 'atrasado'];

                    // Função para renderizar a tabela
                    const renderTable = (items, tabId) => {
                        const currentMapping = columnMappings[tabId] || {};
                        const headers = Object.keys(items[0]).filter(key => !excludedKeys.includes(key));
                        
                        let tableHTML = '<table class="tab-table"><thead><tr>';
                        
                        headers.forEach(header => {
                            const title = currentMapping[header] || header.charAt(0).toUpperCase() + header.slice(1);
                            tableHTML += '<th>' + title + '</th>';
                        });
                        
                        tableHTML += '</tr></thead><tbody>';

                        items.forEach(item => {
                            tableHTML += '<tr>';
                            headers.forEach(header => {
                                let formattedContent = '';
                                const cellContent = item[header];
                                console.log(cellContent);

                                if (['data', 'data_exibicao'].includes(header) && cellContent) {
                                    const [year, month, day] = cellContent.split('-');
                                    formattedContent = day+'/'+month+'/'+year;
                                } else if (header === 'peso' && cellContent !== null) {
                                    formattedContent = cellContent+' kg';
                                } else if (header === 'medicamentos' && Array.isArray(cellContent)) {
                                    formattedContent = '<ul>'+cellContent.map(med => '<li>'+med+'</li>').join('')+'</ul>';
                                } else if (header === 'url' && cellContent) {
                                    formattedContent = '<a href="'+cellContent+'" target="_blank">Visualizar</a>';
                                } else if (typeof cellContent === 'boolean') {
                                    formattedContent = cellContent ? 'Sim' : 'Não';
                                } else {
                                    formattedContent = cellContent || '';
                                }
                                tableHTML += '<td>'+formattedContent+'</td>';
                            });
                            tableHTML += '</tr>';
                        });

                        tableHTML += '</tbody></table>';
                        return tableHTML;
                    };
                    
                    tabContentElement.innerHTML = renderTable(data.items, tabId);

                    // Se for a guia de pesagens, renderiza o gráfico
                    if (tabId === 'pesagens' && data.chartData) {
                        tabContentElement.innerHTML += '<div class="chart-container"><canvas id="weightChart"></canvas></div>';
                        renderChart(data.chartData);
                    }
                    
                    cachedData[tabId] = true;
                }

            } catch (error) {
                console.error('Erro ao buscar dados da guia:', error);
                tabContentElement.innerHTML = '<div class="error-message">Ocorreu um erro ao carregar os dados.</div>';
            }
        }

function renderChart(chartData) {
    // Converte dados do backend em pontos {x,y}
    const dataPoints = chartData.map(item => ({
        x: new Date(item.data),
        y: item.peso
    }));

    const maxWeight = Math.max(...dataPoints.map(p => p.y));
    const maxYValue = Math.ceil(maxWeight / 10) * 10;

    const ctx = document.getElementById('weightChart').getContext('2d');

    // pega primeira e última data reais do dataset
    const dates = chartData.map(item => new Date(item.data));
    const minDate = new Date(Math.min(...dates));
    const today = new Date();

    // adiciona margem de 15 dias antes da primeira data
    const paddedMinDate = new Date(minDate);
    paddedMinDate.setDate(minDate.getDate() - 15);

new Chart(ctx, {
    type: 'line',
    data: {
        datasets: [{
            label: 'Peso',
            data: dataPoints,
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 3
        }]
    },
    options: {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'month',
                    displayFormats: {
                        month: 'MMM yy' // Exibe Jan 23, Fev 23, etc.
                    }
                },
                ticks: {
                    callback: function(value, index, ticks) {
                        const date = new Date(value);
                        // Verifica se é o primeiro mês do ano (Janeiro, que é o mês 0)
                        if (date.getMonth() === 0) {
                            return date.getFullYear(); // Exibe o ano completo
                        } else {
                            // Retorna a primeira letra do mês
                            const month = date.toLocaleString('pt-BR', { month: 'short' });
                            return month.charAt(0).toUpperCase();
                        }
                    },
                    autoSkip: true,
                    maxRotation: 0,
                    minRotation: 0
                },
                min: paddedMinDate,
                max: today,
                grid: {
                    drawTicks: true
                }
            },
            y: {
                beginAtZero: true,
                suggestedMax: maxYValue
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    }
});
            
        }


        // Funções para inicializar o sistema de guias, pop-ups e outras funcionalidades
        function initTabs() {
            const tabButtons = document.querySelectorAll('.tab-btn');
            const tabContents = document.querySelectorAll('.tab-content');
        
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const tabId = button.getAttribute('data-tab');
        
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
        
                    button.classList.add('active');
                    document.getElementById('tab-' + tabId).classList.add('active');
        
                    if (tabId !== 'resumo') {
                        fetchTabData(tabId);
                    }
                });
            });
        }

        //const especies = '+${especies};
        //const racas = '+${racas};
        //const generos = '+${generos};
        //const portes = '+${portes};
        //const cores = '+${cores};
        //const pelagens = '+${pelagens};
        
        let currentButton = null;
        let currentType = null;
        
        function openMenu(data, button, type, labelKey) {
            currentButton = button;
            currentType = type;
        
            const menu = document.getElementById('pop-up-menu');
            const overlay = document.getElementById('overlay');
            const optionsContainer = document.getElementById('pop-up-options-container');
        
            menu.querySelector('h2').textContent = "Selecione " + type.charAt(0).toUpperCase() + type.slice(1);
        
            optionsContainer.innerHTML = '';
            data.forEach(item => {
                const option = document.createElement('div');
                option.classList.add('pop-up-option');
                option.textContent = item[labelKey];
                option.setAttribute('data-id', item.id);
        
                option.onclick = () => selectOption('${animal.animal_id}', item.id, item[labelKey]);
                optionsContainer.appendChild(option);
            });
        
            overlay.style.display = 'block';
            menu.style.display = 'flex';
        }
        
        function closeMenu() {
            document.getElementById('overlay').style.display = 'none';
            document.getElementById('pop-up-menu').style.display = 'none';
        }
        
        function selectOption(idAnimal, valueId, valueText) {
            console.log('selectOption:' + valueId + ' - ' + valueText);
            if (currentButton && currentType) {
                updateCharacteristic(idAnimal, currentType, valueId, valueText);
            }
            closeMenu();
        }
        
        async function updateCharacteristic(animalId, type, valueId, valueText) {
            try {
                let payload = { 
                    animal_id: animalId, 
                    caracteristica: type, 
                    caracteristica_id: valueId, 
                    caracteristica_label: valueText 
                };
                await fetch("https://karah-n8n.uzd6db.easypanel.host/webhook/kaniu_animal_update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
        
                currentButton.textContent = valueText;
                console.log('atualizado com sucesso!');
            } catch (error) {
                console.error('Erro ao atualizar ' + type + ':', error);
            }
        }

        function initDatePopup() {
            const nascimentoButton = document.getElementById("open-nascimento-menu");
            const nascimentoPopup = document.getElementById("pop-up-nascimento");
            const nascimentoInput = document.getElementById("nascimento-input");
            const confirmNascimento = document.getElementById("confirm-nascimento");
            const cancelNascimento = document.getElementById("cancel-nascimento");
            const overlay = document.getElementById("overlay");
        
            nascimentoButton.onclick = function () {
                if (nascimentoButton.textContent !== "Definir Data") {
                    nascimentoInput.value = nascimentoButton.textContent;
                } else {
                    nascimentoInput.value = "";
                }
                overlay.style.display = "block";
                nascimentoPopup.style.display = "flex";
            };
        
            function closeNascimentoPopup() {
                overlay.style.display = "none";
                nascimentoPopup.style.display = "none";
            }
        
            cancelNascimento.onclick = closeNascimentoPopup;
        
            confirmNascimento.onclick = async function () {
                const novaData = nascimentoInput.value;
                if (!novaData) {
                    // Substituindo alert por uma mensagem mais elegante, já que alert não funciona em iframes
                    document.getElementById('pop-up-nascimento').querySelector('.pop-up-nascimento-actions').insertAdjacentHTML('beforebegin', '<p style="color:red; text-align:center;">Selecione uma data válida.</p>');
                    return;
                }
        
                try {
                    await fetch("https://karah-n8n.uzd6db.easypanel.host/webhook/kaniu_animal_update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            animal_id: "animal.animal_id",
                            caracteristica: "nascimento",
                            data_nascimento: novaData
                        })
                    });
        
                    nascimentoButton.textContent = novaData;
                    console.log("Data de nascimento atualizada com sucesso!");
                } catch (error) {
                    console.error("Erro ao atualizar data de nascimento:", error);
                }
        
                closeNascimentoPopup();
            };
        
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" || event.key === "Esc") {
                    closeMenu();
                    closeNascimentoPopup();
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function() {
            initTabs();
            initDatePopup();

            document.getElementById('open-especie-menu').onclick = () =>
                openMenu(${especies}, document.getElementById('open-especie-menu'), 'especie', 'especie');
        
            document.getElementById('open-raca-menu').onclick = () =>
                openMenu(${racas}, document.getElementById('open-raca-menu'), 'raca', 'raca');
        
            document.getElementById('open-genero-menu').onclick = () =>
                openMenu(${generos}, document.getElementById('open-genero-menu'), 'genero', 'genero');
        
            document.getElementById('open-porte-menu').onclick = () =>
                openMenu(${portes}, document.getElementById('open-porte-menu'), 'porte', 'porte');
        
            document.getElementById('open-cor-menu').onclick = () =>
                openMenu(${cores}, document.getElementById('open-cor-menu'), 'cor', 'cor');
        
            document.getElementById('open-pelagem-menu').onclick = () =>
                openMenu(${pelagens}, document.getElementById('open-pelagem-menu'), 'pelagem', 'pelagem');

            // Carrega a guia de resumo por padrão
            document.querySelector('[data-tab="resumo"]').click();
        });
    </script>