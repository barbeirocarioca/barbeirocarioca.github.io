import { SERVICOS_DATA, ADICIONAIS_DISPONIVEIS, configApp, adicionaisParaServico } from './dataLoader';
import { mostrarToast } from './animations';
import { buscarHorariosLivres } from './agenda';

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

    if (!modal.classList.contains('active')) return;
    document.body.style.overflow = '';
    modal.classList.add('is-closing');
    window.setTimeout(() => {
        modal.classList.remove('active', 'is-closing');
    }, 120);
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

let consultaAtual = 0;

/** Monta os horarios do dia: primeiro a agenda real do AppBarber, se falhar os horarios fixos. */
export async function updateAvailableTimes(): Promise<void> {
    const dateInput = document.getElementById('modal-date') as HTMLInputElement | null;
    const select = document.getElementById('modal-service-main') as HTMLSelectElement | null;
    const infoText = document.getElementById('modal-date-info');
    const badge = document.getElementById('selected-time-badge');

    const morningContainer = document.getElementById('chips-morning');
    const afternoonContainer = document.getElementById('chips-afternoon');
    const eveningContainer = document.getElementById('chips-evening');
    if (!morningContainer || !afternoonContainer || !eveningContainer) return;
    const grupos = [morningContainer, afternoonContainer, eveningContainer];

    const limpar = () => grupos.forEach(c => {
        c.innerHTML = '';
        c.parentElement?.classList.remove('hidden');
        c.parentElement?.querySelector('.chip-group-label')?.removeAttribute('data-count');
    });
    limpar();
    selectedHorario = null;
    if (badge) badge.classList.add('hidden');

    if (!dateInput || !dateInput.value) return;

    const info = (texto: string, erro = false) => {
        if (!infoText) return;
        infoText.textContent = texto;
        infoText.className = erro ? 'text-xs text-rose-700 font-medium mt-1' : 'text-xs text-muted mt-1';
    };
    const avisoNosHorarios = (texto: string, erro = false) => {
        const p = document.createElement('p');
        p.className = `text-sm p-3 text-center col-span-full ${erro ? 'text-rose-700 font-medium' : 'text-muted'}`;
        p.textContent = texto;
        morningContainer.appendChild(p);
        afternoonContainer.parentElement?.classList.add('hidden');
        eveningContainer.parentElement?.classList.add('hidden');
    };

    const [year, month, day] = dateInput.value.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();

    // Fechado aos domingos (0) e segundas (1)
    if (dayOfWeek === 0 || dayOfWeek === 1) {
        const msg = dayOfWeek === 0 ? 'A barbearia está fechada aos domingos.' : 'A barbearia está fechada às segundas-feiras.';
        info(msg, true);
        avisoNosHorarios(`${msg} Escolha de terça a sábado.`, true);
        return;
    }

    const now = new Date();
    const hojeISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateInput.value === hojeISO;
    const minimoHoje = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : 0;
    const minutos = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

    const servico = SERVICOS_DATA.find(sv => sv.id === select?.value) || SERVICOS_DATA[0];

    // consulta a agenda real (as respostas antigas sao ignoradas se o cliente trocar a data no meio)
    const minhaConsulta = ++consultaAtual;
    info('Buscando horários livres na agenda do Carioca...');
    avisoNosHorarios('Buscando horários...');
    const livres = servico ? await buscarHorariosLivres(dateInput.value, servico.nome) : null;
    if (minhaConsulta !== consultaAtual) return;
    limpar();

    function criarChip(timeStr: string, container: HTMLElement, desabilitado = false) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'time-chip min-h-[40px] px-2 text-sm font-medium border border-charcoal/15 bg-white text-charcoal';
        btn.textContent = timeStr;
        if (desabilitado) {
            btn.disabled = true;
            btn.title = 'Horário indisponível';
        } else {
            btn.onclick = () => selecionarHorario(timeStr, btn);
        }
        container.appendChild(btn);
    }
    // turnos iguais aos do AppBarber: manha ate 11:59, tarde ate 18:59, noite a partir das 19:00
    const grupoDe = (t: string) => minutos(t) < 12 * 60 ? morningContainer : minutos(t) < 19 * 60 ? afternoonContainer : eveningContainer;

    if (livres) {
        // o AppBarber ja aplica a antecedencia minima dele; aqui so sai o que ja passou do relogio
        const agora = now.getHours() * 60 + now.getMinutes();
        const futuros = livres.filter(t => !isToday || minutos(t) > agora);
        if (!futuros.length) {
            info('Sem horários livres nesta data.', true);
            avisoNosHorarios('A agenda do Carioca está cheia nesta data. Escolha outro dia ou chame no WhatsApp.', true);
            return;
        }
        futuros.forEach(t => criarChip(t, grupoDe(t)));
        grupos.forEach(c => {
            if (!c.children.length) { c.parentElement?.classList.add('hidden'); return; }
            const rotulo = c.parentElement?.querySelector('.chip-group-label');
            if (rotulo) rotulo.setAttribute('data-count', `${c.children.length} horário${c.children.length > 1 ? 's' : ''}`);
        });
        info(`${futuros.length} horário${futuros.length > 1 ? 's' : ''} livre${futuros.length > 1 ? 's' : ''} na agenda do Carioca.`);
        return;
    }

    // sem agenda online: horarios fixos, sujeitos a confirmacao
    info('Horários sujeitos a confirmação pelo WhatsApp (atendimento das 9h às 20h).');
    const periodos = {
        morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
        afternoon: ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
        evening: ['18:00', '18:30', '19:00', '19:30', '20:00']
    };
    periodos.morning.forEach(t => criarChip(t, morningContainer, isToday && minutos(t) < minimoHoje));
    periodos.afternoon.forEach(t => criarChip(t, afternoonContainer, isToday && minutos(t) < minimoHoje));
    periodos.evening.forEach(t => criarChip(t, eveningContainer, isToday && minutos(t) < minimoHoje));
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

    servicoDosAdicionais = null;
    atualizarResumoReserva();
}

let servicoDosAdicionais: string | null = null;

/** Monta os adicionais oferecidos para o servico principal escolhido. */
function renderizarAdicionais(servicoId: string): void {
    const addonsContainer = document.getElementById('modal-addons-container');
    const hint = document.getElementById('modal-addons-hint');
    if (!addonsContainer) return;

    const servico = SERVICOS_DATA.find(s => s.id === servicoId);
    const marcados = new Set(
        [...addonsContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map(cb => cb.value)
    );
    const opcoes = adicionaisParaServico(servico);

    addonsContainer.innerHTML = '';

    if (hint) {
        hint.textContent = servico
            ? (opcoes.length ? `Combinam com ${servico.nome}:` : `${servico.nome} já inclui tudo o que oferecemos como adicional.`)
            : '';
    }

    opcoes.forEach(add => {
        const item = document.createElement('label');
        item.className = 'addon-item flex items-center gap-2.5 p-2.5 bg-white border border-charcoal/10 cursor-pointer hover:border-moss-600 transition-colors text-sm text-charcoal select-none';
        item.innerHTML = `
            <input type="checkbox" value="${add.id}" data-parte="${add.componentes[0]}" class="custom-checkbox">
            <span class="font-medium">${add.nome}</span>
            <span class="text-moss-700 font-medium ml-auto whitespace-nowrap">+ R$ ${add.preco.toFixed(2).replace('.', ',')} <span class="text-muted font-normal">· ${add.duracao} min</span></span>
        `;
        const cb = item.querySelector('input');
        if (cb) {
            cb.checked = marcados.has(add.id);
            cb.addEventListener('change', () => {
                // alternativas: marcar uma desmarca a outra
                // (as duas sobrancelhas; corte e pezinho, porque o corte ja faz o contorno)
                const grupos = [['sobrancelha', 'sobrancelha-navalha'], ['corte', 'pezinho']];
                const parte = cb.dataset.parte || '';
                const grupo = grupos.find(g => g.includes(parte));
                if (cb.checked && grupo) {
                    addonsContainer.querySelectorAll<HTMLInputElement>('input[data-parte]').forEach(o => {
                        if (o !== cb && grupo.includes(o.dataset.parte || '')) o.checked = false;
                    });
                }
                atualizarResumoReserva();
            });
        }
        addonsContainer.appendChild(item);
    });

    addonsContainer.classList.toggle('hidden', opcoes.length === 0);
    const servicoAnterior = servicoDosAdicionais;
    servicoDosAdicionais = servicoId;
    if (servicoAnterior !== null) void updateAvailableTimes();
}

export function atualizarResumoReserva(): void {
    const select = document.getElementById('modal-service-main') as HTMLSelectElement | null;
    if (!select) return;

    const mainServiceId = select.value;
    const servicoPrincipal = SERVICOS_DATA.find(s => s.id === mainServiceId) || SERVICOS_DATA[0];

    if (!servicoPrincipal) return;

    if (servicoDosAdicionais !== servicoPrincipal.id) renderizarAdicionais(servicoPrincipal.id);

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

    const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    // cada item com o seu preco e o seu tempo, para o Carioca ver quanto custa cada coisa
    const adicionais = [...document.querySelectorAll<HTMLInputElement>('#modal-addons-container input[type="checkbox"]:checked')]
        .map(cb => ADICIONAIS_DISPONIVEIS.find(a => a.id === cb.value))
        .filter((a): a is NonNullable<typeof a> => Boolean(a));

    const valorAdicionais = adicionais.reduce((s, a) => s + a.preco, 0);
    const tempoAdicionais = adicionais.reduce((s, a) => s + a.duracao, 0);
    const valorTotal = servicoPrincipal.preco + valorAdicionais;
    const tempoTotal = servicoPrincipal.duracao + tempoAdicionais;

    const formattedDate = date.split('-').reverse().join('/');

    const linhas: string[] = [
        'Olá, Carioca! Gostaria de agendar um horário pelo site:',
        '',
        `*Cliente:* ${name}`,
        `*Contato:* ${phone}`,
        `*Data:* ${formattedDate}`,
        `*Horário:* ${selectedHorario}h`,
        '',
        '*Serviço principal:*',
        `• ${servicoPrincipal.nome}: ${reais(servicoPrincipal.preco)} (${servicoPrincipal.duracao} min)`,
    ];

    if (adicionais.length) {
        linhas.push('', '*Adicionais:*');
        adicionais.forEach(a => linhas.push(`• ${a.nome}: ${reais(a.preco)} (${a.duracao} min)`));
        linhas.push(`Subtotal dos adicionais: ${reais(valorAdicionais)} (${tempoAdicionais} min)`);
    }

    linhas.push(
        '',
        `*Valor total:* ${reais(valorTotal)}`,
        `*Tempo total:* ${tempoTotal} min`,
        `*Local:* ${configApp.barbeariaNome}`,
        '',
        'Aguardo a confirmação!'
    );

    const message = encodeURIComponent(linhas.join('\n'));

    closeBookingModal();
    mostrarToast('Redirecionando para o WhatsApp...', 'sucesso');
    setTimeout(() => {
        window.open(`https://wa.me/${configApp.whatsappNumero}?text=${message}`, '_blank');
    }, 600);
}

