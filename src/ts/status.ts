import { StatusFuncionamento } from './types';

export function verificarStatusFuncionamento(date: Date = new Date()): StatusFuncionamento {
    const day = date.getDay(); // 0 = Domingo, 1 = Segunda, 2 = Terca, ... 6 = Sabado
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    const openMinutes = 9 * 60;   // 09:00
    const closeMinutes = 20 * 60; // 20:00

    const isOpen = (day >= 2 && day <= 6) && (timeInMinutes >= openMinutes && timeInMinutes < closeMinutes);

    if (isOpen) {
        return {
            aberto: true,
            mensagem: 'Aberto agora • Fecha às 20h'
        };
    }

    let mensagem = 'Fechado agora • Abre às 09:00';
    if (day === 0) mensagem = 'Fechado hoje • Abre terça às 09h';
    if (day === 1) mensagem = 'Fechado hoje • Abre amanhã às 09h';

    return {
        aberto: false,
        mensagem
    };
}

export function atualizarStatusEmTempoReal(): void {
    const status = verificarStatusFuncionamento();

    const badgeHeader = document.getElementById('live-status-header');
    const dotHeader = document.getElementById('live-status-dot');
    const textHeader = document.getElementById('live-status-text');

    const badgeMobile = document.getElementById('mobile-live-status');
    const dotMobile = badgeMobile?.querySelector('.status-dot');
    const textMobile = badgeMobile?.querySelector('.status-text');

    if (status.aberto) {
        if (badgeHeader) badgeHeader.className = 'hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border bg-emerald-950/80 border-emerald-500/40 text-emerald-300';
        if (dotHeader) dotHeader.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        if (textHeader) textHeader.textContent = status.mensagem;

        if (badgeMobile) badgeMobile.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border bg-emerald-950/80 border-emerald-500/40 text-emerald-300 mx-auto';
        if (dotMobile) dotMobile.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
        if (textMobile) textMobile.textContent = status.mensagem;
    } else {
        if (badgeHeader) badgeHeader.className = 'hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border bg-rose-950/80 border-rose-500/40 text-rose-300';
        if (dotHeader) dotHeader.className = 'w-2 h-2 rounded-full bg-rose-400';
        if (textHeader) textHeader.textContent = status.mensagem;

        if (badgeMobile) badgeMobile.className = 'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border bg-rose-950/80 border-rose-500/40 text-rose-300 mx-auto';
        if (dotMobile) dotMobile.className = 'w-2 h-2 rounded-full bg-rose-400';
        if (textMobile) textMobile.textContent = status.mensagem;
    }
}

