import { SERVICOS_DATA, configApp } from './dataLoader';
import { selecionarServicoEAgendar } from './booking';

let toastTimeout: number | null = null;
let mobileMenuAberto = false;

export function mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro' | 'info' = 'sucesso'): void {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');

    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = mensagem;

    if (tipo === 'sucesso') {
        iconEl.className = 'fa-solid fa-circle-check text-moss-300 text-sm';
    } else if (tipo === 'erro') {
        iconEl.className = 'fa-solid fa-circle-exclamation text-rose-300 text-sm';
    } else {
        iconEl.className = 'fa-solid fa-circle-info text-moss-300 text-sm';
    }

    toast.classList.remove('-translate-y-12', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (toastTimeout) window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
        toast.classList.add('-translate-y-12', 'opacity-0', 'pointer-events-none');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3500);
}

export function toggleMobileMenu(): void {
    const drawer = document.getElementById('mobile-drawer');
    const icon = document.getElementById('mobile-menu-icon');
    const toggle = document.getElementById('mobile-menu-toggle');
    if (!drawer || !icon) return;

    mobileMenuAberto = !mobileMenuAberto;

    drawer.classList.toggle('is-open', mobileMenuAberto);
    drawer.setAttribute('aria-hidden', String(!mobileMenuAberto));
    icon.className = mobileMenuAberto ? 'fa-solid fa-xmark text-lg' : 'fa-solid fa-bars text-lg';
    if (toggle) {
        toggle.setAttribute('aria-expanded', String(mobileMenuAberto));
        toggle.setAttribute('aria-label', mobileMenuAberto ? 'Fechar menu' : 'Abrir menu');
    }
    document.body.style.overflow = mobileMenuAberto ? 'hidden' : '';
}

export function fecharMenuMobileSeAberto(): void {
    if (mobileMenuAberto) toggleMobileMenu();
}

// Mantido por compatibilidade: as respostas das duvidas agora ficam sempre abertas
export function toggleFaq(_index: number): void { /* sem acordeao */ }

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
            mostrarToast('Endereço copiado.', 'sucesso');
        }).catch(() => {
            mostrarToast(configApp.enderecoTexto, 'info');
        });
    } else {
        mostrarToast(configApp.enderecoTexto, 'info');
    }
}

const SETA = '<svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="m-arrow__stem" d="M1 6h8"/><path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';

export function renderizarServicos(categoria: string = 'todos', animar: boolean = false): void {
    const container = document.getElementById('services-grid');
    if (!container) return;
    container.innerHTML = '';

    const servicosFiltrados = categoria === 'todos'
        ? SERVICOS_DATA
        : SERVICOS_DATA.filter(s => s.categoria === categoria);

    servicosFiltrados.forEach((servico, index) => {
        const row = document.createElement('button');
        row.type = 'button';
        const preco = `R$ ${servico.preco.toFixed(2).replace('.', ',')}`;
        // entrada no scroll (Tailwind group-inview) e troca ao filtrar (is-swapping)
        row.className = `price-row reveal:opacity-0 reveal:translate-y-4 group-inview:opacity-100 group-inview:translate-y-0 transition-all duration-500 ease-out motion-reduce:transition-none${animar ? ' is-swapping' : ''}`;
        row.style.transitionDelay = animar ? '0ms' : `${Math.min(index, 13) * 40}ms`;
        if (animar) row.style.animationDelay = `${Math.min(index, 10) * 25}ms`;
        row.setAttribute('aria-label', `Agendar ${servico.nome}, ${preco}, ${servico.duracao} minutos`);
        row.innerHTML = `
            <span class="price-row__name">${servico.nome}${servico.destaque ? '<span class="price-row__tag">Mais pedido</span>' : ''}</span>
            <span class="price-row__meta">${servico.duracao} min</span>
            <span class="price-row__price">${preco} ${SETA}</span>
        `;
        row.onclick = () => selecionarServicoEAgendar(servico.id);
        container.appendChild(row);
    });
}

export function filtrarServicos(categoria: string): void {
    document.querySelectorAll<HTMLElement>('.filter-tab').forEach(tab => {
        const ativo = tab.dataset.cat === categoria;
        tab.classList.toggle('active', ativo);
        tab.setAttribute('aria-pressed', String(ativo));
    });
    renderizarServicos(categoria, true);
}

export function initAnimations(): void {
    // O cabecalho ganha uma linha inferior depois de rolar (estado, nao animacao de rolagem)
    const header = document.querySelector('.site-header');
    const atualizarHeader = () => header?.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', atualizarHeader, { passive: true });
    atualizarHeader();

    iniciarRevelacaoNoScroll();
}

/**
 * Animacoes de scroll com Tailwind: cada [data-reveal] ganha .is-inview quando entra na tela,
 * o que ativa as classes inview:* e group-inview:* (variantes definidas no tailwind.config).
 * Roda uma vez por elemento. Sem JS, sem IntersectionObserver ou com "reduzir movimento",
 * o <html> nao recebe .js-reveal e tudo aparece parado e visivel.
 */
function iniciarRevelacaoNoScroll(): void {
    const alvos = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!document.documentElement.classList.contains('js-reveal')) {
        alvos.forEach(el => el.classList.add('is-inview'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-inview');
                observer.unobserve(entry.target);
                // depois da entrada, o atraso escalonado sai para nao atrasar o hover
                window.setTimeout(() => {
                    entry.target.querySelectorAll<HTMLElement>('.price-row').forEach(el => { el.style.transitionDelay = ''; });
                }, 1400);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    alvos.forEach(el => observer.observe(el));
}
