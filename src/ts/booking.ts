import { SERVICOS_DATA, ADICIONAIS_DISPONIVEIS, configApp } from './dataLoader';
import { mostrarToast } from './animations';

export let selectedHorario: string | null = null;

export function setSelectedHorario(horario: string | null): void {
    selectedHorario = horario;
}

export function openBookingModal(): void {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const dateInput = document.getElementById('modal-date') as HTMLInputElement | null;
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        if (!dateInput.value) {
            dateInput.value = today;
        }
    }

    updateAvailableTimes();
    atualizarResumoReserva();
}

export function closeBookingModal(): void {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;

    modal.classList.remove('active');
    document.body.style.overflow = '';
}

export function selecionarServicoEAgendar(servicoId: string): void {
    const select = document.getElementById('modal-service-main') as HTMLSelectElement | null;
    if (select) select.value = servicoId;
    openBookingModal();
}

export function selecionarHorario(timeStr: string, btnElement: HTMLButtonElement): void {
    document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('active'));
    btnElement.classList.add('active');
    selectedHorario = timeStr;

    const badge = document.getElementById('selected-time-badge');
    const badgeText = document.getElementById('selected-time-text');
    if (badge && badgeText) {
        badgeText.textContent = `${timeStr}h`;
        badge.classList.remove('hidden');
    }
}

export function updateAvailableTimes(): void {
    const dateInput = document.getElementById('modal-date') as HTMLInputElement | null;
    const infoText = document.getElementById('modal-date-info');
    const badge = document.getElementById('selected-time-badge');

    const morningContainer = document.getElementById('chips-morning');
    const afternoonContainer = document.getElementById('chips-afternoon');
    const eveningContainer = document.getElementById('chips-evening');

    if (!morningContainer || !afternoonContainer || !eveningContainer) return;

    morningContainer.innerHTML = '';
    afternoonContainer.innerHTML = '';
    eveningContainer.innerHTML = '';

    selectedHorario = null;
    if (badge) badge.classList.add('hidden');

    if (!dateInput || !dateInput.value) return;

    const [year, month, day] = dateInput.value.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dayOfWeek = selectedDate.getDay();

    // Fechado aos Domingos (0) e Segundas (1)
    if (dayOfWeek === 0 || dayOfWeek === 1) {
        const msg = dayOfWeek === 0 ? 'A barbearia esta fechada aos domingos.' : 'A barbearia esta fechada as segundas-feiras.';
        if (infoText) {
            infoText.textContent = msg;
            infoText.className = 'text-[11px] text-rose-600 font-bold mt-1';
        }

        const aviso = document.createElement('p');
        aviso.className = 'text-xs text-rose-600 font-semibold p-3 text-center col-span-full';
        aviso.textContent = `${msg} Escolha de terca a sabado.`;
        morningContainer.appendChild(aviso);
        return;
    }

    if (infoText) {
        infoText.textContent = 'Horario de atendimento: 09:00h as 20:00h';
        infoText.className = 'text-[11px] text-gray-500 mt-1';
    }

    const now = new Date();
    const isToday = dateInput.value === now.toISOString().split('T')[0];
    const minValidTimeInMinutes = isToday ? (now.getHours() * 60 + now.getMinutes() + 60) : 0;

    const periodos = {
        morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
        afternoon: ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
        evening: ['18:00', '18:30', '19:00', '19:30', '20:00']
    };

    function criarChip(timeStr: string, container: HTMLElement) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const slotMinutes = hours * 60 + minutes;
        const isPast = isToday && slotMinutes < minValidTimeInMinutes;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-chip py-1.5 px-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700';
        btn.textContent = timeStr;

        if (isPast) {
            btn.disabled = true;
            btn.title = 'Horario expirado';
        } else {
            btn.onclick = () => selecionarHorario(timeStr, btn);
        }

        container.appendChild(btn);
    }

    periodos.morning.forEach(t => criarChip(t, morningContainer));
    periodos.afternoon.forEach(t => criarChip(t, afternoonContainer));
    periodos.evening.forEach(t => criarChip(t, eveningContainer));
}

export function inicializarModalCampos(): void {
    const select = document.getElementById('modal-service-main') as HTMLSelectElement | null;
    if (!select) return;

    select.innerHTML = '';
    SERVICOS_DATA.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.nome} — R$ ${s.preco.toFixed(2).replace('.', ',')} (${s.duracao} min)`;
        select.appendChild(opt);
    });

    const addonsContainer = document.getElementById('modal-addons-container');
    if (!addonsContainer) return;

    addonsContainer.innerHTML = '';
    ADICIONAIS_DISPONIVEIS.forEach(add => {
        const item = document.createElement('label');
        item.className = 'flex items-center gap-2.5 p-2 bg-white rounded-xl border border-gray-200/80 cursor-pointer hover:border-moss-600 transition-colors text-xs text-charcoal select-none';
        item.innerHTML = `
            <input type="checkbox" value="${add.id}" class="custom-checkbox">
            <span class="font-medium">${add.nome}</span>
            <span class="text-moss-700 font-bold ml-auto">+ R$ ${add.preco.toFixed(2).replace('.', ',')}</span>
        `;
        const cb = item.querySelector('input');
        if (cb) {
            cb.addEventListener('change', atualizarResumoReserva);
        }
        addonsContainer.appendChild(item);
    });

    atualizarResumoReserva();
}

export function atualizarResumoReserva(): void {
    const select = document.getElementById('modal-service-main') as HTMLSelectElement | null;
    if (!select) return;

    const mainServiceId = select.value;
    const servicoPrincipal = SERVICOS_DATA.find(s => s.id === mainServiceId) || SERVICOS_DATA[0];

    if (!servicoPrincipal) return;

    let valorTotal = servicoPrincipal.preco;
    let duracaoTotal = servicoPrincipal.duracao;

    const checkboxes = document.querySelectorAll<HTMLInputElement>('#modal-addons-container input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
        const add = ADICIONAIS_DISPONIVEIS.find(a => a.id === cb.value);
        if (add) {
            valorTotal += add.preco;
            duracaoTotal += add.duracao;
        }
    });

    const resumoValor = document.getElementById('resumo-valor');
    const resumoDuracao = document.getElementById('resumo-duracao');

    if (resumoValor) resumoValor.textContent = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    if (resumoDuracao) resumoDuracao.textContent = `${duracaoTotal} min`;
}

export function formatarTelefone(input: HTMLInputElement): void {
    let value = input.value.replace(/\D/g, '').substring(0, 11);
    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    } else if (value.length > 0) {
        value = value.replace(/^(\d*)$/, '($1');
    }
    input.value = value;
}

export function handleModalBookingSubmit(e: Event): void {
    e.preventDefault();

    const dateInput = document.getElementById('modal-date') as HTMLInputElement | null;
    const nameInput = document.getElementById('modal-name') as HTMLInputElement | null;
    const phoneInput = document.getElementById('modal-phone') as HTMLInputElement | null;
    const select = document.getElementById('modal-service-main') as HTMLSelectElement | null;

    if (!dateInput || !nameInput || !phoneInput || !select) return;

    const date = dateInput.value;
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!date) {
        mostrarToast('Por favor, escolha uma data.', 'erro');
        return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dayOfWeek = selectedDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 1) {
        mostrarToast('A barbearia esta fechada aos domingos e segundas.', 'erro');
        return;
    }

    if (!selectedHorario) {
        mostrarToast('Por favor, clique em um horario disponivel.', 'erro');
        return;
    }

    if (!name) {
        mostrarToast('Informe seu nome completo.', 'erro');
        return;
    }

    const servicoPrincipal = SERVICOS_DATA.find(s => s.id === select.value) || SERVICOS_DATA[0];

    const adicionaisNomes: string[] = [];
    let valorTotal = servicoPrincipal.preco;

    const checkboxes = document.querySelectorAll<HTMLInputElement>('#modal-addons-container input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
        const add = ADICIONAIS_DISPONIVEIS.find(a => a.id === cb.value);
        if (add) {
            adicionaisNomes.push(`${add.nome} (+ R$ ${add.preco.toFixed(2).replace('.', ',')})`);
            valorTotal += add.preco;
        }
    });

    const formattedDate = date.split('-').reverse().join('/');
    const strAdicionais = adicionaisNomes.length > 0
        ? `%0A*Adicionais:* ${encodeURIComponent(adicionaisNomes.join(', '))}`
        : '';

    const message = `Ola Carioca! Gostaria de agendar um horario pelo site:%0A%0A` +
        `*Cliente:* ${encodeURIComponent(name)}%0A` +
        `*Contato:* ${encodeURIComponent(phone)}%0A` +
        `*Servico:* ${encodeURIComponent(servicoPrincipal.nome)}%0A` +
        `*Data:* ${encodeURIComponent(formattedDate)}%0A` +
        `*Horario:* ${encodeURIComponent(selectedHorario)}h` +
        strAdicionais + `%0A` +
        `*Valor Estimado:* R$ ${encodeURIComponent(valorTotal.toFixed(2).replace('.', ','))}%0A` +
        `*Espaco de Atendimento:* ${encodeURIComponent(configApp.barbeariaNome)}%0A%0A` +
        `Aguardando confirmacao!`;

    closeBookingModal();
    mostrarToast('Redirecionando para o WhatsApp...', 'sucesso');
    setTimeout(() => {
        window.open(`https://wa.me/${configApp.whatsappNumero}?text=${message}`, '_blank');
    }, 600);
}

