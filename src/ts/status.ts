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
            mensagem: 'Aberto agora, fecha às 20h'
        };
    }

    let mensagem = 'Fechado agora, abre às 9h';
    if (day === 0) mensagem = 'Fechado hoje, abre terça às 9h';
    if (day === 1) mensagem = 'Fechado hoje, abre amanhã às 9h';

    return {
        aberto: false,
        mensagem
    };
}

export function atualizarStatusEmTempoReal(): void {
    const status = verificarStatusFuncionamento();
    const estado = status.aberto ? 'is-open' : 'is-closed';

    const badgeHeader = document.getElementById('live-status-header');
    const textHeader = document.getElementById('live-status-text');
    const badgeMobile = document.getElementById('mobile-live-status');
    const textMobile = badgeMobile?.querySelector('.status-text');

    [badgeHeader, badgeMobile].forEach(b => {
        if (!b) return;
        b.classList.remove('is-open', 'is-closed');
        b.classList.add(estado);
    });
    if (textHeader) textHeader.textContent = status.mensagem;
    if (textMobile) textMobile.textContent = status.mensagem;
}
