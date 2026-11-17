import { SERVICOS_DATA, configApp } from './dataLoader';
import { selecionarServicoEAgendar } from './booking';

let toastTimeout: number | null = null;
let mobileMenuAberto = false;
let contadoresJaAnimados = false;

export function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso'): void {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');

    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = mensagem;

    if (tipo === 'sucesso') {
        iconEl.className = 'fa-solid fa-circle-check text-emerald-400 text-sm';
    } else if (tipo === 'erro') {
        iconEl.className = 'fa-solid fa-circle-exclamation text-rose-400 text-sm';
    } else {
        iconEl.className = 'fa-solid fa-circle-info text-moss-700 text-sm';
    }

    toast.classList.remove('-translate-y-12', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (toastTimeout) window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
        toast.classList.add('-translate-y-12', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3500);
}

export function animarContadores(): void {
    if (contadoresJaAnimados) return;
    contadoresJaAnimados = true;

    document.querySelectorAll<HTMLElement>('.counter-number').forEach(el => {
        const target = parseInt(el.dataset.target || '0', 10);
        const prefix = el.textContent?.startsWith('+') ? '+' : '';
        let start = 0;
        const duration = 1200;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) {
                start = target;
                clearInterval(timer);
            }
            el.textContent = prefix + Math.round(start);
        }, 16);
    });
}

export function toggleMobileMenu(): void {
    const drawer = document.getElementById('mobile-drawer');
    const icon = document.getElementById('mobile-menu-icon');
    if (!drawer || !icon) return;

    mobileMenuAberto = !mobileMenuAberto;

    if (mobileMenuAberto) {
        drawer.classList.remove('opacity-0', 'pointer-events-none');
        drawer.classList.add('opacity-100', 'pointer-events-auto');
        icon.className = 'fa-solid fa-xmark text-lg';
    } else {
        drawer.classList.add('opacity-0', 'pointer-events-none');
        drawer.classList.remove('opacity-100', 'pointer-events-auto');
        icon.className = 'fa-solid fa-bars text-lg';
    }
}

export function fecharMenuMobileSeAberto(): void {
    if (mobileMenuAberto) toggleMobileMenu();
}

export function toggleFaq(index: number): void {
    const content = document.getElementById(`faq-content-${index}`);
    const icon = document.getElementById(`faq-icon-${index}`);
    if (!content) return;

    const isOpen = content.classList.contains('open');

    for (let i = 1; i <= 5; i++) {
        const c = document.getElementById(`faq-content-${i}`);
        const ic = document.getElementById(`faq-icon-${i}`);
        if (c) c.classList.remove('open');
        if (ic) ic.classList.remove('rotate-180');
    }

    if (!isOpen) {
        content.classList.add('open');
        if (icon) icon.classList.add('rotate-180');
    }
}

export function abrirGoogleMaps(): void {
    if (configApp.googleMapsUrl) {
        window.open(configApp.googleMapsUrl, '_blank');
    } else {
        const [lat, lng] = configApp.coordenadas;
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
}

export function abrirWaze(): void {
    const [lat, lng] = configApp.coordenadas;
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
}

export function copiarEndereco(): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(configApp.enderecoTexto).then(() => {
            mostrarToast('Endereco copiado para a area de transferencia!', 'sucesso');
        }).catch(() => {
            mostrarToast(configApp.enderecoTexto, 'info');
        });
    } else {
        mostrarToast(configApp.enderecoTexto, 'info');
    }
}

export function renderizarServicos(categoria: string = 'todos'): void {
    const container = document.getElementById('services-grid');
    if (!container) return;
    container.innerHTML = '';

    const servicosFiltrados = categoria === 'todos'
        ? SERVICOS_DATA
        : SERVICOS_DATA.filter(s => s.categoria === categoria);

    servicosFiltrados.forEach((servico, index) => {
        const card = document.createElement('div');
        card.style.animation = `cardEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.05}s both`;

        if (servico.destaque) {
            card.className = 'interactive-card bg-moss-700 text-white rounded-3xl p-7 shadow-2xl relative flex flex-col justify-between border-2 border-moss-400 transform lg:-translate-y-2';
            card.innerHTML = `
                <div class="absolute -top-3.5 right-6 bg-emerald-400 text-charcoal text-[10px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                    <i class="fa-solid fa-crown text-[10px]"></i>
                    <span>Mais Solicitado</span>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-4">
                        <span class="px-3 py-1 bg-moss-800 text-moss-200 text-xs font-bold rounded-xl border border-moss-600 flex items-center gap-1">
                            <i class="fa-regular fa-clock text-[10px]"></i> ${servico.duracao} min
                        </span>
                        <span class="font-heading text-3xl font-black text-white">R$ ${servico.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <h3 class="font-heading font-bold text-xl text-white mb-2">${servico.nome}</h3>
                    <p class="text-moss-100 text-xs sm:text-sm mb-6 leading-relaxed">${servico.desc}</p>
                </div>
                <button type="button" class="btn-agendar-combo btn-shine w-full py-3.5 px-4 rounded-2xl bg-white text-moss-700 hover:bg-moss-50 font-extrabold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95">
                    <span>Agendar Combo</span>
                    <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
            `;
            const btn = card.querySelector<HTMLButtonElement>('.btn-agendar-combo');
            if (btn) btn.onclick = () => selecionarServicoEAgendar(servico.id);
        } else {
            card.className = 'interactive-card glass-card rounded-3xl p-7 flex flex-col justify-between group';
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-4">
                        <span class="px-3 py-1 bg-moss-50 text-moss-700 text-xs font-bold rounded-xl border border-moss-200 flex items-center gap-1">
                            <i class="fa-regular fa-clock text-[10px]"></i> ${servico.duracao} min
                        </span>
                        <span class="font-heading text-2xl font-black text-moss-700">R$ ${servico.preco.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <h3 class="font-heading font-bold text-xl text-charcoal mb-2">${servico.nome}</h3>
                    <p class="text-gray-600 text-xs sm:text-sm mb-6 leading-relaxed">${servico.desc}</p>
                </div>
                <button type="button" class="btn-selecionar-servico btn-shine w-full py-3 px-4 rounded-2xl bg-moss-700 hover:bg-moss-800 text-white font-bold transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95">
                    <span>Selecionar &amp; Agendar</span>
                    <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
            `;
            const btn = card.querySelector<HTMLButtonElement>('.btn-selecionar-servico');
            if (btn) btn.onclick = () => selecionarServicoEAgendar(servico.id);
        }

        container.appendChild(card);
    });
}

export function filtrarServicos(categoria: string): void {
    document.querySelectorAll<HTMLElement>('.filter-tab').forEach(tab => {
        if (tab.dataset.cat === categoria) {
            tab.classList.remove('bg-white', 'text-gray-700', 'border', 'border-gray-200');
            tab.classList.add('bg-moss-700', 'text-white', 'shadow-md');
        } else {
            tab.classList.add('bg-white', 'text-gray-700', 'border', 'border-gray-200');
            tab.classList.remove('bg-moss-700', 'text-white', 'shadow-md');
        }
    });
    renderizarServicos(categoria);
}

export function initAnimations(): void {
    // Scroll reveal observer
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal, .reveal-item, .reveal-left, .reveal-right').forEach(el => {
        revealObserver.observe(el);
    });

    // Sticky Header Scroll
    window.addEventListener('scroll', () => {
        const capsule = document.querySelector('.glass-capsule');
        if (capsule) {
            if (window.scrollY > 60) {
                capsule.classList.add('scrolled');
            } else {
                capsule.classList.remove('scrolled');
            }
        }
    }, { passive: true });

    // Animacao de contadores quando a secao de inicio entra
    const heroSection = document.getElementById('inicio');
    if (heroSection) {
        const heroObs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setTimeout(animarContadores, 400);
                heroObs.disconnect();
            }
        }, { threshold: 0.3 });
        heroObs.observe(heroSection);
    }
}

