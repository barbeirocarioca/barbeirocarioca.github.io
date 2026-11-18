import './styles/main.css';

import { carregarParcerias } from './ts/parcerias';

import {
    carregarDadosDoServidor
} from './ts/dataLoader';

import {
    atualizarStatusEmTempoReal
} from './ts/status';

import {
    openBookingModal,
    closeBookingModal,
    selecionarServicoEAgendar,
    updateAvailableTimes,
    atualizarResumoReserva,
    handleModalBookingSubmit,
    formatarTelefone,
    inicializarModalCampos
} from './ts/booking';

import {
    initAnimations,
    toggleMobileMenu,
    fecharMenuMobileSeAberto,
    toggleFaq,
    abrirGoogleMaps,
    abrirWaze,
    copiarEndereco,
    mostrarToast,
    filtrarServicos,
    renderizarServicos
} from './ts/animations';

import {
    inicializarMapa
} from './ts/map';

// Exporta funcoes para o escopo global (window) para compatibilidade com eventos do HTML
declare global {
    interface Window {
        openBookingModal: typeof openBookingModal;
        closeBookingModal: typeof closeBookingModal;
        selecionarServicoEAgendar: typeof selecionarServicoEAgendar;
        updateAvailableTimes: typeof updateAvailableTimes;
        atualizarResumoReserva: typeof atualizarResumoReserva;
        handleModalBookingSubmit: typeof handleModalBookingSubmit;
        formatarTelefone: typeof formatarTelefone;
        toggleMobileMenu: typeof toggleMobileMenu;
        fecharMenuMobileSeAberto: typeof fecharMenuMobileSeAberto;
        toggleFaq: typeof toggleFaq;
        abrirGoogleMaps: typeof abrirGoogleMaps;
        abrirWaze: typeof abrirWaze;
        copiarEndereco: typeof copiarEndereco;
        mostrarToast: typeof mostrarToast;
        filtrarServicos: typeof filtrarServicos;
    }
}

window.openBookingModal = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.selecionarServicoEAgendar = selecionarServicoEAgendar;
window.updateAvailableTimes = updateAvailableTimes;
window.atualizarResumoReserva = atualizarResumoReserva;
window.handleModalBookingSubmit = handleModalBookingSubmit;
window.formatarTelefone = formatarTelefone;
window.toggleMobileMenu = toggleMobileMenu;
window.fecharMenuMobileSeAberto = fecharMenuMobileSeAberto;
window.toggleFaq = toggleFaq;
window.abrirGoogleMaps = abrirGoogleMaps;
window.abrirWaze = abrirWaze;
window.copiarEndereco = copiarEndereco;
window.mostrarToast = mostrarToast;
window.filtrarServicos = filtrarServicos;

// Fechar modal ao clicar no fundo
document.getElementById('booking-modal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'booking-modal') {
        closeBookingModal();
    }
});

// Fechar com a tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBookingModal();
        fecharMenuMobileSeAberto();
    }
});

// Inicializacao quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    // Carrega dados dinâmicos dos arquivos .txt
    await carregarDadosDoServidor((lat, lng) => {
        inicializarMapa(lat, lng);
    });

    renderizarServicos('todos');
    inicializarModalCampos();
    initAnimations();
    carregarParcerias();

    // Status Aberto/Fechado
    atualizarStatusEmTempoReal();
    setInterval(atualizarStatusEmTempoReal, 60000);
});

