import { Servico, Adicional, DadosConfiguracao } from './types';

export const configApp: DadosConfiguracao = {
    barbeariaNome: 'Mr. Falcone Barbearia',
    whatsappNumero: '5521995660434',
    whatsappFormatado: '(21) 99566-0434',
    googleMapsUrl: 'https://www.google.com/maps/place/MR.+FALCONE+BARBEARIA/@-22.9775066,-49.8848476,61m/data=!3m1!1e3!4m6!3m5!1s0x94c019c25443e6bf:0x5f445b1142552958!8m2!3d-22.9773743!4d-49.8849181!16s%2Fg%2F11jxzng012',
    enderecoTexto: 'Rua Benedito José Pinheiro, 825 - Ourinhos / SP',
    horarioTexto: 'Terça a Sábado: 09:00h às 20:00h',
    coordenadas: [-22.9773743, -49.8849181],
    avisoTexto: ''
};

export let SERVICOS_DATA: Servico[] = [];
export let ADICIONAIS_DISPONIVEIS: Adicional[] = [];

export function parseOpcoesTxt(rawText: string): Servico[] {
    const lines = rawText.split('\n');
    const parsedServices: Servico[] = [];

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const partsPipe = trimmed.split('|');
        const mainPart = partsPipe[0].trim();
        const customDuration = partsPipe[1] ? parseInt(partsPipe[1].replace(/\D/g, ''), 10) : null;
        const customDesc = partsPipe[2] ? partsPipe[2].trim() : null;

        const parts = mainPart.split(/—|-|:/);
        if (parts.length < 2) return;

        const nome = parts[0].trim();
        const precoRaw = parts.slice(1).join('-').trim();
        const precoMatch = precoRaw.match(/\d+([.,]\d+)?/);
        const preco = precoMatch ? parseFloat(precoMatch[0].replace(',', '.')) : 0;

        const nomeLower = nome.toLowerCase();

        let categoria = 'acabamento';
        if (nomeLower.includes('combo') || (nomeLower.includes('corte') && nomeLower.includes('barba'))) {
            categoria = 'combos';
        } else if (nomeLower.includes('barba')) {
            categoria = 'barba';
        } else if (nomeLower.includes('corte') || (nomeLower.includes('cabelo') && !nomeLower.includes('nariz') && !nomeLower.includes('ouvido'))) {
            categoria = 'cabelo';
        }

        let duracao = customDuration || 30;
        if (!customDuration) {
            if (nomeLower.includes('corte, barba, tintura') || (nomeLower.includes('tintura') && nomeLower.includes('cabelo') && nomeLower.includes('barba'))) {
                duracao = 105;
            } else if (nomeLower.includes('corte, barba') || (nomeLower.includes('barba') && nomeLower.includes('tintura') && nomeLower.includes('corte'))) {
                duracao = 90;
            } else if (nomeLower.includes('corte e barba') || nomeLower.includes('corte + barba')) {
                duracao = 60;
            } else if (nomeLower.includes('corte')) {
                duracao = 45;
            } else if (nomeLower.includes('barba e tintura')) {
                duracao = 45;
            } else if (nomeLower.includes('barba')) {
                duracao = 30;
            } else if (nomeLower.includes('tintura')) {
                duracao = 40;
            } else if (nomeLower.includes('pezinho') || nomeLower.includes('sobrancelha') || nomeLower.includes('depilação') || nomeLower.includes('penteado')) {
                duracao = 15;
            }
        }

        let desc = customDesc;
        if (!desc) {
            if (nomeLower.includes('corte e barba')) {
                desc = 'O combo clássico indispensável para renovar o visual por completo com estilo e sofisticação.';
            } else if (nomeLower.includes('barba e tintura')) {
                desc = 'Alinhamento profissional da barba acompanhado de tintura para fios brancos ou preenchimento de falhas.';
            } else if (nomeLower.includes('corte, barba, tintura da barba e')) {
                desc = 'Transformação integral de alto padrão cobrindo corte, barba e respectivas tinturas capilares.';
            } else if (nomeLower.includes('corte, barba')) {
                desc = 'Combo completo de corte e barba com acabamento na navalha e produtos premium.';
            } else if (nomeLower.includes('corte')) {
                desc = 'Corte moderno ou clássico com acabamento refinado e visagismo adaptado ao formato facial.';
            } else if (nomeLower.includes('barba')) {
                desc = 'Modelagem completa com toalha quente, alinhamento simétrico na navalha e hidratação profunda.';
            } else if (nomeLower.includes('sobrancelha')) {
                desc = 'Alinhamento e design de sobrancelhas masculinas para valorizar a expressão do olhar.';
            } else if (nomeLower.includes('pezinho')) {
                desc = 'Manutenção rápida do contorno do cabelo e nuca para manter o corte em dia.';
            } else if (nomeLower.includes('tintura')) {
                desc = 'Aplicação profissional de tintura capilar com efeito natural e cobertura uniforme de fios brancos.';
            } else if (nomeLower.includes('depilação')) {
                desc = 'Remoção higiênica e rápida dos pelos com cera morna suave e segura.';
            } else if (nomeLower.includes('penteado')) {
                desc = 'Finalização e modelagem com pomada ou pó estilizador premium para ocasiões especiais.';
            } else {
                desc = 'Atendimento profissional de alto padrão com produtos e técnicas especializadas.';
            }
        }

        const destaque = nomeLower === 'corte e barba' || nomeLower.includes('mais solicitado');

        parsedServices.push({
            id: 'srv-' + (parsedServices.length + 1),
            nome,
            preco,
            duracao,
            categoria,
            desc,
            destaque
        });
    });

    return parsedServices;
}

export async function carregarServicosDeTxt(): Promise<void> {
    try {
        const res = await fetch('opcoes.txt');
        if (res.ok) {
            const text = await res.text();
            const parsed = parseOpcoesTxt(text);
            if (parsed.length > 0) {
                SERVICOS_DATA = parsed;
            }
        }
    } catch (err) {
        console.warn('Usando servicos padrao por indisponibilidade de opcoes.txt:', err);
    }

    if (SERVICOS_DATA.length === 0) {
        SERVICOS_DATA = [
            { id: 'srv-1', nome: 'Corte', preco: 50, duracao: 45, categoria: 'cabelo', desc: 'Corte moderno ou clássico com acabamento refinado e visagismo facial.' },
            { id: 'srv-2', nome: 'Barba', preco: 45, duracao: 30, categoria: 'barba', desc: 'Modelagem completa com toalha quente e acabamento na navalha.' },
            { id: 'srv-3', nome: 'Corte e Barba', preco: 90, duracao: 60, categoria: 'combos', destaque: true, desc: 'O combo clássico indispensável para renovar o visual completo.' }
        ];
    }

    ADICIONAIS_DISPONIVEIS = SERVICOS_DATA.filter(s => {
        const n = s.nome.toLowerCase();
        return s.preco <= 30 || s.categoria === 'acabamento' || n.includes('tintura da barba') || n.includes('sobrancelha') || n.includes('pezinho') || n.includes('depilação');
    }).map(s => ({
        id: s.id,
        nome: s.nome,
        preco: s.preco,
        duracao: s.duracao
    }));
}

export async function carregarWhatsApp(): Promise<void> {
    try {
        const res = await fetch('whatsapp.txt');
        if (res.ok) {
            const raw = await res.text();
            const digits = raw.replace(/\D/g, '');
            if (digits.length >= 10) {
                configApp.whatsappNumero = digits.startsWith('55') ? digits : '55' + digits;
                const localNum = digits.startsWith('55') ? digits.slice(2) : digits;
                if (localNum.length === 11) {
                    configApp.whatsappFormatado = `(${localNum.slice(0, 2)}) ${localNum.slice(2, 7)}-${localNum.slice(7)}`;
                } else if (localNum.length === 10) {
                    configApp.whatsappFormatado = `(${localNum.slice(0, 2)}) ${localNum.slice(2, 6)}-${localNum.slice(6)}`;
                } else {
                    configApp.whatsappFormatado = localNum;
                }

                document.querySelectorAll<HTMLElement>('.txt-whatsapp').forEach(el => el.textContent = configApp.whatsappFormatado);
                document.querySelectorAll<HTMLAnchorElement>('.link-whatsapp').forEach(el => {
                    el.href = `https://wa.me/${configApp.whatsappNumero}`;
                });
            }
        }
    } catch {
        console.warn('Usando WhatsApp padrao');
    }
}

export async function carregarGoogle(): Promise<void> {
    try {
        const res = await fetch('google.txt');
        if (res.ok) {
            const txt = (await res.text()).trim();
            if (txt && txt.startsWith('http')) {
                configApp.googleMapsUrl = txt;
                document.querySelectorAll<HTMLAnchorElement>('.link-google').forEach(el => {
                    el.href = configApp.googleMapsUrl;
                });
            }
        }
    } catch {
        console.warn('Usando Google Maps padrao');
    }
}

export async function carregarAviso(): Promise<void> {
    try {
        const res = await fetch('aviso.txt');
        if (res.ok) {
            const txt = (await res.text()).trim();
            const banner = document.getElementById('top-announcement');
            const txtAviso = document.getElementById('txt-aviso');
            if (banner && txtAviso) {
                if (txt && txt.length > 0) {
                    configApp.avisoTexto = txt;
                    txtAviso.textContent = txt;
                    banner.classList.remove('hidden');
                } else {
                    banner.classList.add('hidden');
                }
            }
        }
    } catch {
        console.warn('Sem aviso configurado');
    }
}

export async function carregarBarbearia(): Promise<void> {
    try {
        const res = await fetch('barbearia.txt');
        if (res.ok) {
            const txt = (await res.text()).trim();
            if (txt) {
                configApp.barbeariaNome = txt;
                document.querySelectorAll<HTMLElement>('.txt-barbearia').forEach(el => el.textContent = configApp.barbeariaNome);
            }
        }
    } catch {
        console.warn('Usando nome padrao da barbearia');
    }
}

export async function carregarDadosDoServidor(callbackMapa?: (lat: number, lng: number) => void): Promise<void> {
    await carregarBarbearia();
    await carregarWhatsApp();
    await carregarGoogle();
    await carregarAviso();
    await carregarServicosDeTxt();

    try {
        const resEnd = await fetch('endereco.txt');
        if (resEnd.ok) {
            const txtEnd = (await resEnd.text()).trim();
            if (txtEnd) {
                configApp.enderecoTexto = txtEnd;
                document.querySelectorAll<HTMLElement>('.txt-endereco').forEach(el => el.textContent = configApp.enderecoTexto);
            }
        }

        const resHorario = await fetch('horario.txt');
        if (resHorario.ok) {
            const txtHorario = (await resHorario.text()).trim();
            if (txtHorario) {
                configApp.horarioTexto = txtHorario;
                document.querySelectorAll<HTMLElement>('.txt-horario').forEach(el => el.textContent = configApp.horarioTexto);
            }
        }

        const resLoc = await fetch('loc.txt');
        if (resLoc.ok) {
            const txtLoc = (await resLoc.text()).trim();
            const [lat, lng] = txtLoc.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                configApp.coordenadas = [lat, lng];
                if (callbackMapa) callbackMapa(lat, lng);
            } else if (callbackMapa) {
                callbackMapa(-22.9773743, -49.8849181);
            }
        } else if (callbackMapa) {
            callbackMapa(-22.9773743, -49.8849181);
        }
    } catch (err) {
        console.error('Erro ao ler arquivos de texto:', err);
        if (callbackMapa) callbackMapa(-22.9773743, -49.8849181);
    }
}

