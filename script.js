/**
 * Patas & Esperança - Aplicação Frontend & Sistema CMS
 * Sincronização em Tempo Real Multi-Dispositivo com Persistência via API
 */

// Configurações e Estado Global
const CMS_ADMIN_TOKEN = 'patas@2026';
let currentAdminUser = null;
let currentConfig = null;
let currentTheme = null;
let animalsList = [];
let activeSpeciesFilter = 'todos';
let lastSystemVersion = 0;
let isSaving = false;

// Helpers de Toast Notification
function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-800 transition-all duration-300 transform translate-y-3 opacity-0";
    
    let icon = '<i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>';
    if (tipo === 'info') icon = '<i class="fa-solid fa-circle-info text-sky-400 text-base"></i>';
    if (tipo === 'error') icon = '<i class="fa-solid fa-triangle-exclamation text-rose-400 text-base"></i>';

    toast.innerHTML = `${icon}<span>${mensagem}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-3', 'opacity-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// 1. CARREGAMENTO INICIAL E SINCRONIZAÇÃO EM TEMPO REAL VIA API
async function loadInitialData() {
    try {
        const [themeRes, contentRes, animalsRes] = await Promise.all([
            fetch('/api/theme?v=' + Date.now(), { cache: 'no-store' }),
            fetch('/api/content?v=' + Date.now(), { cache: 'no-store' }),
            fetch('/api/animals?v=' + Date.now(), { cache: 'no-store' })
        ]);

        if (themeRes.ok) {
            currentTheme = await themeRes.json();
            applyTheme(currentTheme);
        }

        if (contentRes.ok) {
            currentConfig = await contentRes.json();
            renderFullSite();
        }

        if (animalsRes.ok) {
            animalsList = await animalsRes.json();
            renderAnimals();
            renderAdminAnimalList();
        }

        checkAdminSession();
        startMultiDevicePolling();
    } catch (err) {
        console.warn('[Sync] Falha ao conectar à API local, usando dados estáticos:', err);
    }
}

// 2. POLLING LEVE MULTI-DISPOSITIVO (Verifica alterações a cada 8s ou ao voltar para a aba)
function startMultiDevicePolling() {
    setInterval(async () => {
        if (isSaving) return;
        await checkServerUpdates();
    }, 8000);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            checkServerUpdates();
        }
    });
}

async function checkServerUpdates() {
    try {
        const res = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        
        if (lastSystemVersion !== 0 && data.version > lastSystemVersion) {
            console.log('[Sync] Atualização detectada em outro dispositivo! Sincronizando tela...');
            
            const [themeRes, contentRes, animalsRes] = await Promise.all([
                fetch('/api/theme?v=' + Date.now(), { cache: 'no-store' }),
                fetch('/api/content?v=' + Date.now(), { cache: 'no-store' }),
                fetch('/api/animals?v=' + Date.now(), { cache: 'no-store' })
            ]);

            if (themeRes.ok) {
                currentTheme = await themeRes.json();
                applyTheme(currentTheme);
            }
            if (contentRes.ok) {
                currentConfig = await contentRes.json();
                renderFullSite();
                if (document.getElementById('admin-drawer').classList.contains('translate-x-0')) {
                    populateAdminInputs();
                }
            }
            if (animalsRes.ok) {
                animalsList = await animalsRes.json();
                renderAnimals();
                renderAdminAnimalList();
            }

            const syncIndicator = document.getElementById('sync-status-indicator');
            if (syncIndicator) {
                syncIndicator.textContent = "Atualizado em tempo real agora mesmo!";
                setTimeout(() => {
                    syncIndicator.textContent = "Persistência em API Ativa (Multi-dispositivos)";
                }, 3000);
            }
        }
        lastSystemVersion = data.version;
    } catch (e) {
        // Silencioso em caso de queda momentânea
    }
}

// 3. APLICAÇÃO DE TEMA E CORES CSS
function applyTheme(theme) {
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary || '#059669');
    root.style.setProperty('--color-primary-hover', theme.primaryHover || '#047857');
    root.style.setProperty('--color-secondary', theme.secondary || '#0284c7');
    root.style.setProperty('--color-accent', theme.accent || '#f59e0b');

    // Converte hex para RGB para classes translúcidas
    const rgb = hexToRgb(theme.primary || '#059669');
    if (rgb) {
        root.style.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    const pInput = document.getElementById('cfg-color-primary');
    const sInput = document.getElementById('cfg-color-secondary');
    const aInput = document.getElementById('cfg-color-accent');
    if (pInput) pInput.value = theme.primary || '#059669';
    if (sInput) sInput.value = theme.secondary || '#0284c7';
    if (aInput) aInput.value = theme.accent || '#f59e0b';
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// 4. RENDERIZAÇÃO COMPLETA DA LANDING PAGE
function renderFullSite() {
    if (!currentConfig) return;
    const { org, hero, stats, urgentCase, donation, about, transparency, testimonials, contact, sections } = currentConfig;

    // Header & Títulos
    if (org) {
        document.getElementById('page-title').textContent = `${org.name} - ${org.tagline}`;
        document.getElementById('nav-org-name').textContent = org.name;
        document.getElementById('nav-org-tagline').textContent = org.tagline;
        document.getElementById('footer-org-name').textContent = org.name;
        document.getElementById('footer-copy-name').textContent = org.name;
    }

    // Banner Caso Urgente
    const urgentBanner = document.getElementById('urgent-case-banner');
    if (urgentCase && urgentCase.active && sections?.urgente !== false) {
        urgentBanner.classList.remove('hidden');
        document.getElementById('urgent-badge').textContent = urgentCase.badge || 'Urgência Médica';
        document.getElementById('urgent-title').textContent = urgentCase.title;
        document.getElementById('urgent-stats').textContent = `R$ ${urgentCase.raised?.toLocaleString('pt-BR')} de R$ ${urgentCase.goal?.toLocaleString('pt-BR')} arrecadados`;
    } else {
        urgentBanner.classList.add('hidden');
    }

    // Hero Section
    if (hero) {
        document.getElementById('hero-badge-text').textContent = org?.badge || 'ONG 100% Sem Fins Lucrativos';
        document.getElementById('hero-title').innerHTML = hero.title.replace(/amor, cuidado e dignidade/gi, `<span style="color: var(--color-primary)">amor, cuidado e dignidade</span>`);
        document.getElementById('hero-subtitle').textContent = hero.subtitle;
        document.getElementById('hero-image').src = hero.image;
        document.getElementById('hero-card-badge').textContent = hero.badgeCard || 'Resgate Ativo 24h';
        document.getElementById('hero-card-quote').textContent = hero.quoteCard || 'Transformando dor em carinho e esperança.';
    }

    // Métricas Hero
    if (stats) {
        document.getElementById('stat-vidas').textContent = stats.vidasSalvas || '+1.450';
        document.getElementById('stat-adocoes').textContent = stats.adocoesFelizes || '+680';
        document.getElementById('stat-racao').textContent = stats.racaoMes || '3.2 Ton';
        document.getElementById('stat-transparencia').textContent = stats.transparencia || '100%';
    }

    // Seção de Doação & PIX
    if (donation) {
        document.getElementById('donation-section-title').textContent = donation.title || 'Faça Sua Contribuição Salvar Uma Vida';
        document.getElementById('donation-section-subtitle').textContent = donation.subtitle || 'Cada real arrecadado vai direto para ração, tratamentos e vacinas.';

        const alvo = Number(donation.metaAlvo) || 18000;
        const atual = Number(donation.metaAtual) || 11450;
        const percentual = Math.min(Math.round((atual / alvo) * 100), 100);

        document.getElementById('meta-alvo-display').textContent = `R$ ${alvo.toLocaleString('pt-BR')}`;
        document.getElementById('meta-atual-display').textContent = `R$ ${atual.toLocaleString('pt-BR')}`;
        document.getElementById('meta-progress-bar').style.width = `${percentual}%`;
        document.getElementById('meta-percentual-text').textContent = `${percentual}% da meta do mês alcançada`;

        document.getElementById('pix-key-display').textContent = donation.pixKey;
        document.getElementById('bank-owner').textContent = donation.bankOwner;
        document.getElementById('bank-name').textContent = donation.bankName;
        document.getElementById('bank-cnpj').textContent = donation.bankCnpj;
        
        // QR Code oficial dinâmico
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(donation.pixKey)}`;
        document.getElementById('pix-qr-code').src = qrUrl;
    }

    // Seção Sobre Nós
    if (about) {
        document.getElementById('about-badge').textContent = about.badge || 'Quem Somos';
        document.getElementById('about-title').textContent = about.title;
        document.getElementById('about-image').src = about.image;
        
        const paragraphsContainer = document.getElementById('about-paragraphs');
        paragraphsContainer.innerHTML = '';
        if (about.paragraphs && Array.isArray(about.paragraphs)) {
            about.paragraphs.forEach(p => {
                const el = document.createElement('p');
                el.textContent = p;
                paragraphsContainer.appendChild(el);
            });
        }
    }

    // Transparência
    if (transparency && transparency.expenses) {
        document.getElementById('transparency-title').textContent = transparency.title || 'Onde Seu Dinheiro é Investido';
        document.getElementById('transparency-subtitle').textContent = transparency.subtitle || 'Veja a divisão contábil do último mês.';
        
        const transGrid = document.getElementById('transparency-grid');
        transGrid.innerHTML = '';
        transparency.expenses.forEach(exp => {
            const card = document.createElement('div');
            card.className = "bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 text-center flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="w-13 h-13 mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mb-4 shadow-inner">
                        <i class="fa-solid ${exp.icon || 'fa-chart-pie'}"></i>
                    </div>
                    <span class="text-3xl font-black text-slate-900">${exp.percentage}%</span>
                    <h3 class="font-bold text-base text-slate-800 mt-1">${exp.category}</h3>
                    <p class="text-xs text-slate-500 mt-2 leading-relaxed">${exp.desc}</p>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700" style="width: ${exp.percentage}%; background-color: var(--color-primary)"></div>
                </div>
            `;
            transGrid.appendChild(card);
        });
    }

    // Finais Felizes / Depoimentos
    if (testimonials && Array.isArray(testimonials)) {
        const testGrid = document.getElementById('testimonials-grid');
        testGrid.innerHTML = '';
        testimonials.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between";
            card.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center gap-1 text-amber-400 text-sm">
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                    </div>
                    <p class="text-sm text-slate-600 italic leading-relaxed">"${item.text}"</p>
                </div>
                <div class="flex items-center gap-3 pt-5 mt-4 border-t border-slate-100">
                    <img src="${item.photo}" alt="${item.name}" class="w-12 h-12 rounded-full object-cover border-2 border-emerald-500" onerror="this.src='https://placehold.co/100x100/059669/ffffff?text=Tutor'">
                    <div>
                        <h4 class="text-xs font-bold text-slate-900">${item.name}</h4>
                        <span class="text-[11px] text-slate-500 font-medium">${item.pet}</span>
                    </div>
                </div>
            `;
            testGrid.appendChild(card);
        });
    }

    // Contatos Footer
    if (contact) {
        document.getElementById('footer-phone').textContent = contact.phone || '(11) 99123-4567';
        document.getElementById('footer-email').textContent = contact.email || 'contato@patasesperanca.ong.br';
        document.getElementById('footer-location').textContent = contact.location || 'São Paulo, SP';
    }

    // Visibilidade de Seções
    if (sections) {
        toggleSectionVisibility('como-ajudar', 'nav-link-doar', sections.doacao !== false);
        toggleSectionVisibility('animais', 'nav-link-animais', sections.animais !== false);
        toggleSectionVisibility('sobre', 'nav-link-sobre', sections.sobre !== false);
        toggleSectionVisibility('transparencia', 'nav-link-transparencia', sections.transparencia !== false);
        toggleSectionVisibility('depoimentos', 'nav-link-depoimentos', sections.depoimentos !== false);
        toggleSectionVisibility('contato', 'nav-link-contato', sections.contato !== false);
    }
}

function toggleSectionVisibility(sectionId, navLinkId, isVisible) {
    const sec = document.getElementById(sectionId);
    const navLink = document.getElementById(navLinkId);
    if (sec) sec.style.display = isVisible ? 'block' : 'none';
    if (navLink) navLink.style.display = isVisible ? 'inline-block' : 'none';
}

// 5. RENDERIZAÇÃO DOS ANIMAIS NA VITRINE PÚBLICA
function renderAnimals() {
    const grid = document.getElementById('animais-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = animalsList.filter(animal => {
        if (activeSpeciesFilter === 'todos') return true;
        if (activeSpeciesFilter === 'Tratamento') {
            return animal.status && animal.status.toLowerCase().includes('tratamento');
        }
        return animal.species && animal.species.toLowerCase() === activeSpeciesFilter.toLowerCase();
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-400 font-medium">Nenhum animal cadastrado nesta categoria no momento.</div>`;
        return;
    }

    filtered.forEach(animal => {
        const card = document.createElement('div');
        card.className = "animal-card bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group";

        const isAdopted = animal.status === 'Adotado';
        const isTreatment = animal.status && animal.status.includes('Tratamento');
        
        let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (isAdopted) badgeClass = 'bg-slate-800 text-white border-slate-700';
        else if (isTreatment) badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';

        card.innerHTML = `
            <div>
                <div class="animal-card-img-wrap h-60 bg-slate-100">
                    <img src="${animal.photo}" alt="${animal.name}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x400/059669/ffffff?text=${encodeURIComponent(animal.name)}'">
                    
                    <span class="absolute top-3.5 right-3.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shadow-sm backdrop-blur-md ${badgeClass}">
                        ${animal.status || 'Disponível'}
                    </span>
                    
                    <span class="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-900/80 text-white backdrop-blur-sm flex items-center gap-1.5 shadow">
                        <i class="${animal.species === 'Cachorro' ? 'fa-solid fa-dog' : 'fa-solid fa-cat'}"></i>
                        <span>${animal.gender || 'Pet'} • ${animal.age}</span>
                    </span>
                </div>

                <div class="p-5">
                    <div class="flex items-center justify-between mb-1.5">
                        <h3 class="text-xl font-black text-slate-900">${animal.name}</h3>
                        <span class="text-xs font-semibold text-slate-500">${animal.size || 'Porte Médio'}</span>
                    </div>
                    
                    ${animal.tag ? `<span class="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 mb-2">${animal.tag}</span>` : ''}

                    <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">${animal.desc}</p>
                </div>
            </div>

            <div class="p-5 pt-0">
                <button onclick="openAnimalDetails('${animal.id}')" class="w-full py-3 rounded-xl text-center text-xs font-bold text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-95" style="background-color: var(--color-primary)">
                    <i class="fa-solid fa-heart text-xs text-rose-300"></i>
                    <span>Quero Conhecer / Adotar</span>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// 6. DETALHES DO ANIMAL (MODAL COM WHATSAPP DIRETO)
window.openAnimalDetails = (id) => {
    const animal = animalsList.find(a => a.id === id);
    if (!animal) return;

    const orgPhone = currentConfig?.contact?.whatsapp || '5511991234567';
    const zapMsg = encodeURIComponent(`Olá! Gostaria de saber mais informações sobre a adoção do animalzinho ${animal.name} que vi no site da ONG.`);
    const zapUrl = `https://wa.me/${orgPhone}?text=${zapMsg}`;

    const modalContent = document.getElementById('modal-animal-content');
    modalContent.innerHTML = `
        <div class="relative h-64 bg-slate-900">
            <img src="${animal.photo}" alt="${animal.name}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x400/059669/ffffff?text=${encodeURIComponent(animal.name)}'">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
            <div class="absolute bottom-4 left-4 right-4 text-white">
                <div class="flex items-center gap-2 mb-1">
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500 text-white">${animal.species} • ${animal.gender || 'Macho'}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white">${animal.status}</span>
                </div>
                <h3 class="text-3xl font-black">${animal.name}</h3>
            </div>
        </div>

        <div class="p-6 space-y-5">
            <div class="flex items-center justify-between text-xs font-semibold text-slate-500 border-b pb-3">
                <span><i class="fa-solid fa-cake-candles mr-1 text-emerald-600"></i> Idade: <strong>${animal.age}</strong></span>
                <span><i class="fa-solid fa-weight-scale mr-1 text-emerald-600"></i> Porte: <strong>${animal.size}</strong></span>
            </div>

            <p class="text-sm text-slate-600 leading-relaxed">${animal.desc}</p>
            
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-2 text-xs text-slate-700">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i> 
                    <span>Vacinado e com carteirinha em dia</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i> 
                    <span>Castrado com termo de responsabilidade</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i> 
                    <span>Vermifugado e protegido contra parasitas</span>
                </div>
                ${animal.specialCare ? `
                    <div class="flex items-center gap-2 pt-1 border-t border-slate-200 text-amber-800">
                        <i class="fa-solid fa-circle-info text-amber-600"></i> 
                        <span>${animal.specialCare}</span>
                    </div>
                ` : ''}
            </div>

            <div class="flex flex-col sm:flex-row gap-3 pt-2">
                <a href="#como-ajudar" onclick="closeAnimalModal()" class="flex-1 py-3.5 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2">
                    <i class="fa-solid fa-hand-holding-heart text-amber-400"></i>
                    <span>Apadrinhar Despesas</span>
                </a>
                <a href="${zapUrl}" target="_blank" class="flex-1 py-3.5 text-center rounded-xl text-white text-xs font-bold shadow-lg transition flex items-center justify-center gap-2" style="background-color: var(--color-primary)">
                    <i class="fa-brands fa-whatsapp text-sm"></i>
                    <span>Adotar via WhatsApp</span>
                </a>
            </div>
        </div>
    `;
    document.getElementById('animal-modal').classList.remove('hidden');
};

window.closeAnimalModal = () => {
    document.getElementById('animal-modal').classList.add('hidden');
};

// 7. FILTROS DA VITRINE DE ANIMAIS
window.filterAnimalSpecies = (species, event) => {
    activeSpeciesFilter = species;
    document.querySelectorAll('.animal-filter-btn').forEach(btn => {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('bg-slate-200', 'text-slate-700');
    });
    if (event && event.currentTarget) {
        event.currentTarget.classList.remove('bg-slate-200', 'text-slate-700');
        event.currentTarget.classList.add('bg-slate-900', 'text-white');
    }
    renderAnimals();
};

// 8. CÁLCULO E DOAÇÃO PIX
window.setDonationFrequency = (freq) => {
    const btnU = document.getElementById('freq-unica-btn');
    const btnM = document.getElementById('freq-mensal-btn');
    if (freq === 'unica') {
        btnU.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm";
        btnM.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900";
    } else {
        btnM.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all bg-white text-slate-900 shadow-sm";
        btnU.className = "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all text-slate-600 hover:text-slate-900";
        showToast("Você escolheu Doação Mensal! Seja um padrinho fiel da nossa ONG.", "info");
    }
};

window.selectPresetValue = (val) => {
    document.getElementById('custom-donation-input').value = val;
    document.querySelectorAll('.val-preset-btn').forEach(btn => {
        btn.classList.remove('border-emerald-500', 'bg-emerald-50/70', 'text-emerald-800');
        btn.classList.add('border-slate-200', 'text-slate-700');
    });
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('border-emerald-500', 'bg-emerald-50/70', 'text-emerald-800');
        event.currentTarget.classList.remove('border-slate-200', 'text-slate-700');
    }
    updateImpactDesc(val);
};

window.handleCustomAmountInput = (e) => {
    const val = Number(e.target.value) || 0;
    updateImpactDesc(val);
};

function updateImpactDesc(val) {
    const desc = document.getElementById('impact-description');
    if (!desc) return;
    if (val <= 25) {
        desc.textContent = "R$ 20 compra sachês úmidos de suporte e vermífugo para 1 filhote por 1 semana.";
    } else if (val <= 60) {
        desc.textContent = "R$ 50 fornece ração super premium e antiparasitário para 1 cão por 15 dias.";
    } else if (val <= 150) {
        desc.textContent = "R$ 100 financia vacinas essenciais (V10/V4) e consulta clínica com exames.";
    } else {
        desc.textContent = `R$ ${val} cobre microchipagem, castração cirúrgica e suporte pós-operatório completo.`;
    }
}

window.copiarPixPrincipal = () => {
    const pix = currentConfig?.donation?.pixKey || "pix@patasesperanca.ong.br";
    
    // Suporte moderno e fallback
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pix).catch(() => fallbackCopy(pix));
    } else {
        fallbackCopy(pix);
    }

    const copyBtnLabel = document.getElementById('copy-pix-btn-label');
    if (copyBtnLabel) {
        const orig = copyBtnLabel.textContent;
        copyBtnLabel.textContent = "Chave PIX Copiada com Sucesso!";
        setTimeout(() => { copyBtnLabel.textContent = orig; }, 3000);
    }

    showToast(`Chave PIX copiada: ${pix}`);
};

function fallbackCopy(text) {
    const temp = document.createElement("input");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
}

// 9. FORMULÁRIO DE CONTATO / VOLUNTARIADO / ADOÇÃO (SALVA NA API)
window.handleContactSubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('contact-submit-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    const payload = {
        name: document.getElementById('contact-name').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        petName: document.getElementById('contact-pet').value.trim(),
        interest: document.getElementById('contact-interest').value,
        message: document.getElementById('contact-message').value.trim()
    };

    try {
        const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(`Obrigado, ${payload.name}! Sua mensagem foi registrada com carinho.`);
            e.target.reset();
        } else {
            showToast("Não foi possível enviar a mensagem. Tente novamente.", "error");
        }
    } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        showToast("Erro ao conectar ao servidor.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Enviar Mensagem com Amor</span>`;
    }
};

// 10. CONTROLE DO MENU RESPONSIVO MOBILE
window.toggleMobileNav = () => {
    const nav = document.getElementById('mobile-nav');
    nav.classList.toggle('hidden');
};

window.closeMobileNav = () => {
    document.getElementById('mobile-nav').classList.add('hidden');
};

// 11. SISTEMA DE AUTENTICAÇÃO E CMS DRAWER
function checkAdminSession() {
    const token = sessionStorage.getItem('ong_admin_token');
    const userEmail = sessionStorage.getItem('ong_admin_email');
    if (token === CMS_ADMIN_TOKEN && userEmail) {
        currentAdminUser = { email: userEmail, token };
        updateAdminUIState(true);
    } else {
        currentAdminUser = null;
        updateAdminUIState(false);
    }
}

function updateAdminUIState(isAdmin) {
    const btnIcon = document.getElementById('admin-btn-icon');
    const btnText = document.getElementById('admin-btn-text');
    const footerIcon = document.getElementById('footer-admin-icon');
    const footerText = document.getElementById('footer-admin-text');
    const adminEmailSpan = document.getElementById('admin-user-email');

    if (isAdmin) {
        btnIcon.className = 'fa-solid fa-gear text-emerald-600 animate-spin';
        btnText.textContent = 'CMS Ativo';
        footerIcon.className = 'fa-solid fa-gear text-emerald-400';
        footerText.textContent = 'Gerenciar CMS (Ativo)';
        if (adminEmailSpan) adminEmailSpan.textContent = currentAdminUser.email;
    } else {
        btnIcon.className = 'fa-solid fa-lock text-slate-600';
        btnText.textContent = 'CMS';
        footerIcon.className = 'fa-solid fa-lock text-emerald-400';
        footerText.textContent = 'Acesso Restrito / CMS';
        closeAdminPanel();
    }
}

window.handleAdminButtonClick = () => {
    if (currentAdminUser) {
        openAdminPanel();
    } else {
        openLoginModal();
    }
};

window.openLoginModal = () => {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-error').classList.add('hidden');
};

window.closeLoginModal = () => {
    document.getElementById('login-modal').classList.add('hidden');
};

window.fillDemoCredentials = () => {
    document.getElementById('login-email').value = "admin@ongamoranimal.org";
    document.getElementById('login-password').value = "admin123";
};

window.handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit-btn');

    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Validando...`;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
            sessionStorage.setItem('ong_admin_token', data.token);
            sessionStorage.setItem('ong_admin_email', data.user.email);
            currentAdminUser = { email: data.user.email, token: data.token };
            updateAdminUIState(true);
            closeLoginModal();
            openAdminPanel();
            showToast("Acesso administrativo liberado!");
        } else {
            errorDiv.textContent = data.error || "Credenciais inválidas. Verifique seu e-mail e senha.";
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        errorDiv.textContent = "Erro ao conectar ao servidor de autenticação.";
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Entrar no Painel</span><i class="fa-solid fa-arrow-right text-xs"></i>`;
    }
};

window.handleLogout = () => {
    sessionStorage.removeItem('ong_admin_token');
    sessionStorage.removeItem('ong_admin_email');
    currentAdminUser = null;
    updateAdminUIState(false);
    closeAdminPanel();
    showToast("Sessão administrativa encerrada.", "info");
};

window.openAdminPanel = () => {
    if (!currentAdminUser) {
        openLoginModal();
        return;
    }
    populateAdminInputs();
    fetchAdminMessages();
    document.getElementById('admin-drawer').classList.remove('translate-x-full');
};

window.closeAdminPanel = () => {
    document.getElementById('admin-drawer').classList.add('translate-x-full');
};

window.switchAdminTab = (tabId) => {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('border-emerald-600', 'text-emerald-700', 'bg-white');
        btn.classList.add('border-transparent');
    });

    document.getElementById(tabId).classList.remove('hidden');
    const activeBtn = document.getElementById(`tab-btn-${tabId.replace('tab-', '')}`);
    if (activeBtn) {
        activeBtn.classList.add('border-emerald-600', 'text-emerald-700', 'bg-white');
        activeBtn.classList.remove('border-transparent');
    }
};

// 12. POPULAR INPUTS DO CMS COM O ESTADO ATUAL
function populateAdminInputs() {
    if (!currentConfig) return;
    const { org, hero, stats, urgentCase, donation, contact, sections } = currentConfig;

    document.getElementById('cfg-org-name').value = org?.name || '';
    document.getElementById('cfg-org-tagline').value = org?.tagline || '';
    document.getElementById('cfg-hero-title').value = hero?.title || '';
    document.getElementById('cfg-hero-subtitle').value = hero?.subtitle || '';
    document.getElementById('cfg-hero-image').value = hero?.image || '';

    document.getElementById('cfg-stat-vidas').value = stats?.vidasSalvas || '';
    document.getElementById('cfg-stat-adocoes').value = stats?.adocoesFelizes || '';

    document.getElementById('cfg-phone').value = contact?.phone || '';
    document.getElementById('cfg-email').value = contact?.email || '';

    document.getElementById('cfg-meta-alvo').value = donation?.metaAlvo || 18000;
    document.getElementById('cfg-meta-atual').value = donation?.metaAtual || 11450;
    document.getElementById('cfg-pix-key').value = donation?.pixKey || '';
    document.getElementById('cfg-bank-owner').value = donation?.bankOwner || '';
    document.getElementById('cfg-bank-cnpj').value = donation?.bankCnpj || '';

    if (urgentCase) {
        document.getElementById('cfg-urgent-active').checked = urgentCase.active !== false;
        document.getElementById('cfg-urgent-title').value = urgentCase.title || '';
        document.getElementById('cfg-urgent-goal').value = urgentCase.goal || 2800;
        document.getElementById('cfg-urgent-raised').value = urgentCase.raised || 1550;
    }

    if (sections) {
        document.getElementById('sec-toggle-urgente').checked = sections.urgente !== false;
        document.getElementById('sec-toggle-doacao').checked = sections.doacao !== false;
        document.getElementById('sec-toggle-animais').checked = sections.animais !== false;
        document.getElementById('sec-toggle-sobre').checked = sections.sobre !== false;
        document.getElementById('sec-toggle-transparencia').checked = sections.transparencia !== false;
        document.getElementById('sec-toggle-depoimentos').checked = sections.depoimentos !== false;
        document.getElementById('sec-toggle-contato').checked = sections.contato !== false;
    }
}

// 13. EDIÇÃO EM TEMPO REAL DE TEMA
window.liveColorChange = () => {
    const primary = document.getElementById('cfg-color-primary').value;
    const secondary = document.getElementById('cfg-color-secondary').value;
    const accent = document.getElementById('cfg-color-accent').value;
    currentTheme = { ...currentTheme, primary, secondary, accent };
    applyTheme(currentTheme);
};

window.liveHeroImageChange = () => {
    const val = document.getElementById('cfg-hero-image').value;
    if (val) {
        document.getElementById('hero-image').src = val;
    }
};

window.applyColorPreset = (p, s, a, name) => {
    currentTheme = { primary: p, secondary: s, accent: a, preset: name };
    applyTheme(currentTheme);
    showToast(`Preset "${name}" aplicado! Clique em Publicar para salvar.`, "info");
};

// 14. SALVAR TODAS AS CONFIGURAÇÕES NO SERVIDOR VIA API (/api/save-content & /api/save-theme)
window.saveAllConfigurationsToServer = async () => {
    if (!currentAdminUser) {
        showToast("Você precisa estar autenticado como administrador.", "error");
        return;
    }

    isSaving = true;
    const btn = document.getElementById('btn-save-cms');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando em Nuvem...`;

    try {
        const updatedConfig = {
            ...currentConfig,
            org: {
                ...currentConfig.org,
                name: document.getElementById('cfg-org-name').value.trim(),
                tagline: document.getElementById('cfg-org-tagline').value.trim()
            },
            hero: {
                ...currentConfig.hero,
                title: document.getElementById('cfg-hero-title').value.trim(),
                subtitle: document.getElementById('cfg-hero-subtitle').value.trim(),
                image: document.getElementById('cfg-hero-image').value.trim()
            },
            stats: {
                ...currentConfig.stats,
                vidasSalvas: document.getElementById('cfg-stat-vidas').value.trim(),
                adocoesFelizes: document.getElementById('cfg-stat-adocoes').value.trim()
            },
            contact: {
                ...currentConfig.contact,
                phone: document.getElementById('cfg-phone').value.trim(),
                email: document.getElementById('cfg-email').value.trim()
            },
            donation: {
                ...currentConfig.donation,
                metaAlvo: Number(document.getElementById('cfg-meta-alvo').value) || 18000,
                metaAtual: Number(document.getElementById('cfg-meta-atual').value) || 0,
                pixKey: document.getElementById('cfg-pix-key').value.trim(),
                bankOwner: document.getElementById('cfg-bank-owner').value.trim(),
                bankCnpj: document.getElementById('cfg-bank-cnpj').value.trim()
            },
            urgentCase: {
                ...currentConfig.urgentCase,
                active: document.getElementById('cfg-urgent-active').checked,
                title: document.getElementById('cfg-urgent-title').value.trim(),
                goal: Number(document.getElementById('cfg-urgent-goal').value) || 2800,
                raised: Number(document.getElementById('cfg-urgent-raised').value) || 0
            },
            sections: {
                urgente: document.getElementById('sec-toggle-urgente').checked,
                doacao: document.getElementById('sec-toggle-doacao').checked,
                animais: document.getElementById('sec-toggle-animais').checked,
                sobre: document.getElementById('sec-toggle-sobre').checked,
                transparencia: document.getElementById('sec-toggle-transparencia').checked,
                depoimentos: document.getElementById('sec-toggle-depoimentos').checked,
                contato: document.getElementById('sec-toggle-contato').checked
            },
            updatedAt: new Date().toISOString()
        };

        const updatedTheme = {
            primary: document.getElementById('cfg-color-primary').value,
            secondary: document.getElementById('cfg-color-secondary').value,
            accent: document.getElementById('cfg-color-accent').value,
            preset: currentTheme?.preset || 'Personalizado',
            updatedAt: new Date().toISOString()
        };

        // Envia as duas requisições para a API com o Token
        const [contentRes, themeRes] = await Promise.all([
            fetch('/api/save-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Token': CMS_ADMIN_TOKEN
                },
                body: JSON.stringify(updatedConfig)
            }),
            fetch('/api/save-theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Token': CMS_ADMIN_TOKEN
                },
                body: JSON.stringify(updatedTheme)
            })
        ]);

        if (contentRes.ok && themeRes.ok) {
            currentConfig = updatedConfig;
            currentTheme = updatedTheme;
            renderFullSite();
            applyTheme(currentTheme);
            showToast("Publicado com sucesso! Refletido em todos os dispositivos.");
        } else {
            showToast("Falha ao salvar dados no servidor.", "error");
        }
    } catch (err) {
        console.error("Erro ao salvar no servidor:", err);
        showToast("Erro de comunicação com o servidor.", "error");
    } finally {
        isSaving = false;
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Publicar em Todos os Dispositivos`;
    }
};

// 15. CRUD DE ANIMAIS NO CMS VIA API (/api/save-animals)
function renderAdminAnimalList() {
    const list = document.getElementById('admin-animal-list');
    if (!list) return;
    list.innerHTML = '';

    if (animalsList.length === 0) {
        list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Nenhum animal cadastrado no momento.</div>`;
        return;
    }

    animalsList.forEach(animal => {
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${animal.photo}" class="w-11 h-11 rounded-xl object-cover border border-slate-300" onerror="this.src='https://placehold.co/80x80/059669/fff?text=Pet'">
                <div>
                    <p class="text-xs font-bold text-slate-800">${animal.name}</p>
                    <span class="text-[11px] text-slate-500 font-medium">${animal.species} • ${animal.status}</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="editAnimal('${animal.id}')" class="p-2 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-white" title="Editar">
                    <i class="fa-regular fa-pen-to-square"></i>
                </button>
                <button onclick="deleteAnimalFromServer('${animal.id}')" class="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white" title="Excluir">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

window.openAnimalFormModal = (animal = null) => {
    const modal = document.getElementById('animal-editor-modal');
    const title = document.getElementById('animal-modal-title');
    
    if (animal) {
        title.textContent = `Editar Amiguinho: ${animal.name}`;
        document.getElementById('edit-animal-doc-id').value = animal.id;
        document.getElementById('animal-form-name').value = animal.name;
        document.getElementById('animal-form-species').value = animal.species;
        document.getElementById('animal-form-gender').value = animal.gender || 'Macho';
        document.getElementById('animal-form-age').value = animal.age;
        document.getElementById('animal-form-size').value = animal.size || 'Porte Médio';
        document.getElementById('animal-form-status').value = animal.status;
        document.getElementById('animal-form-tag').value = animal.tag || '';
        document.getElementById('animal-form-photo').value = animal.photo;
        document.getElementById('animal-form-desc').value = animal.desc;
    } else {
        title.textContent = "Cadastrar Amiguinho";
        document.getElementById('edit-animal-doc-id').value = '';
        document.getElementById('animal-form-name').value = '';
        document.getElementById('animal-form-species').value = 'Cachorro';
        document.getElementById('animal-form-gender').value = 'Macho';
        document.getElementById('animal-form-age').value = '';
        document.getElementById('animal-form-size').value = 'Porte Médio';
        document.getElementById('animal-form-status').value = 'Aguardando Adoção';
        document.getElementById('animal-form-tag').value = 'Dócil e brincalhão';
        document.getElementById('animal-form-photo').value = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';
        document.getElementById('animal-form-desc').value = '';
    }
    modal.classList.remove('hidden');
};

window.closeAnimalFormModal = () => {
    document.getElementById('animal-editor-modal').classList.add('hidden');
};

window.editAnimal = (id) => {
    const animal = animalsList.find(a => a.id === id);
    if (animal) openAnimalFormModal(animal);
};

window.handleSaveAnimal = async (e) => {
    e.preventDefault();
    if (!currentAdminUser) {
        showToast("Apenas administradores autenticados podem salvar dados.", "error");
        return;
    }

    const btn = document.getElementById('btn-save-animal');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const docId = document.getElementById('edit-animal-doc-id').value;
    const animalData = {
        name: document.getElementById('animal-form-name').value.trim(),
        species: document.getElementById('animal-form-species').value,
        gender: document.getElementById('animal-form-gender').value,
        age: document.getElementById('animal-form-age').value.trim(),
        size: document.getElementById('animal-form-size').value.trim(),
        status: document.getElementById('animal-form-status').value,
        tag: document.getElementById('animal-form-tag').value.trim(),
        photo: document.getElementById('animal-form-photo').value.trim(),
        desc: document.getElementById('animal-form-desc').value.trim(),
        updatedAt: Date.now()
    };

    let updatedList = [...animalsList];
    if (docId) {
        const index = updatedList.findIndex(a => a.id === docId);
        if (index !== -1) {
            updatedList[index] = { ...updatedList[index], ...animalData };
        }
    } else {
        animalData.id = 'animal-' + Date.now();
        animalData.createdAt = Date.now();
        updatedList.unshift(animalData);
    }

    try {
        const res = await fetch('/api/save-animals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': CMS_ADMIN_TOKEN
            },
            body: JSON.stringify(updatedList)
        });

        if (res.ok) {
            animalsList = updatedList;
            renderAnimals();
            renderAdminAnimalList();
            closeAnimalFormModal();
            showToast("Dados do animal salvos e replicados em todos os dispositivos!");
        } else {
            showToast("Erro ao salvar lista de animais no servidor.", "error");
        }
    } catch (err) {
        showToast("Erro de conexão ao salvar animal.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar Animal';
    }
};

window.deleteAnimalFromServer = async (id) => {
    if (!currentAdminUser) return;
    if (!confirm("Deseja realmente remover este animal do catálogo da ONG?")) return;

    const updatedList = animalsList.filter(a => a.id !== id);
    try {
        const res = await fetch('/api/save-animals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': CMS_ADMIN_TOKEN
            },
            body: JSON.stringify(updatedList)
        });

        if (res.ok) {
            animalsList = updatedList;
            renderAnimals();
            renderAdminAnimalList();
            showToast("Animal removido com sucesso!");
        }
    } catch (e) {
        showToast("Erro ao excluir animal.", "error");
    }
};

// 16. CAIXA DE ENTRADA / MENSAGENS RECEBIDAS (CMS)
window.fetchAdminMessages = async () => {
    if (!currentAdminUser) return;
    const container = document.getElementById('admin-messages-list');
    if (!container) return;

    try {
        const res = await fetch('/api/messages', {
            headers: { 'X-Admin-Token': CMS_ADMIN_TOKEN }
        });
        if (res.ok) {
            const msgs = await res.json();
            if (msgs.length === 0) {
                container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Nenhuma mensagem recebida ainda.</div>`;
                return;
            }

            container.innerHTML = '';
            msgs.forEach(m => {
                const dateStr = new Date(m.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const zapNumber = (m.phone || '').replace(/\D/g, '');
                const zapLink = `https://wa.me/55${zapNumber}?text=${encodeURIComponent(`Olá ${m.name}! Somos da ONG Patas & Esperança e vimos sua mensagem sobre "${m.interest}".`)}`;

                const item = document.createElement('div');
                item.className = "p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs";
                item.innerHTML = `
                    <div class="flex items-center justify-between">
                        <strong class="text-slate-900 font-extrabold text-sm">${m.name}</strong>
                        <span class="text-[10px] text-slate-400">${dateStr}</span>
                    </div>
                    <div class="text-slate-600">
                        <span class="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">${m.interest}</span>
                        ${m.petName && m.petName !== '-' ? `<span class="ml-1 text-slate-500">Pet: <strong>${m.petName}</strong></span>` : ''}
                    </div>
                    <p class="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">${m.message || 'Sem mensagem adicional.'}</p>
                    <div class="flex items-center justify-between pt-1">
                        <span class="text-slate-500"><i class="fa-solid fa-phone mr-1"></i> ${m.phone}</span>
                        <a href="${zapLink}" target="_blank" class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm">
                            <i class="fa-brands fa-whatsapp"></i> Conversar
                        </a>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (e) {
        container.innerHTML = `<div class="p-4 text-xs text-rose-500">Erro ao carregar mensagens.</div>`;
    }
};

// 17. INICIALIZAÇÃO DO CICLO DE VIDA
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year-copy').textContent = new Date().getFullYear();
    loadInitialData();
});
