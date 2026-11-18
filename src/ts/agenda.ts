/**
 * Consulta de horarios livres na agenda do AppBarber (configurada em public/appbarber.txt).
 * Devolve:
 *  - string[] com os horarios livres do profissional ("14:45", "15:00", ...), possivelmente vazio;
 *  - null quando nao da para consultar (sem configuracao, servico sem codigo, erro de rede ou CORS).
 *    Nesse caso o site usa os horarios fixos.
 */

interface ConfigAppBarber {
    empresa: string;
    profissional: string;
    clientId: string;
    authorization: string;
    deviceId: string;
    clientCode: string;
    servicos: Map<string, string>; // nome do servico (minusculo) -> codigo
}

interface HorarioApi { scheduling_time?: string; }
interface ProfissionalApi { employee_code?: number | string; avaliable?: HorarioApi[]; available?: HorarioApi[]; }
interface RespostaApi { error?: boolean; schedules?: ProfissionalApi[]; }

const CAMPOS: Record<string, keyof Omit<ConfigAppBarber, 'servicos'>> = {
    empresa: 'empresa',
    profissional: 'profissional',
    client_id: 'clientId',
    authorization: 'authorization',
    device_id: 'deviceId',
    client_code: 'clientCode',
};

let configPromise: Promise<ConfigAppBarber | null> | null = null;
const cache = new Map<string, Promise<string[] | null>>();

function normalizar(nome: string): string {
    return nome.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function carregarConfig(): Promise<ConfigAppBarber | null> {
    try {
        const res = await fetch('appbarber.txt', { cache: 'no-cache' });
        if (!res.ok) return null;
        const cfg: ConfigAppBarber = {
            empresa: '', profissional: '', clientId: '', authorization: '', deviceId: '', clientCode: '',
            servicos: new Map(),
        };
        for (const bruta of (await res.text()).split('\n')) {
            const linha = bruta.trim();
            if (!linha || linha.startsWith('#') || !linha.includes('=')) continue;
            const i = linha.indexOf('=');
            const chave = linha.slice(0, i).trim();
            const valor = linha.slice(i + 1).trim();
            const campo = CAMPOS[chave.toLowerCase()];
            if (campo) cfg[campo] = valor;
            else if (valor) cfg.servicos.set(normalizar(chave), valor);
        }
        return cfg.empresa && cfg.clientId ? cfg : null;
    } catch {
        return null;
    }
}

function config(): Promise<ConfigAppBarber | null> {
    if (!configPromise) configPromise = carregarConfig();
    return configPromise;
}

/** dataISO no formato do <input type="date">: "2026-11-18" */
export function buscarHorariosLivres(dataISO: string, nomeServico: string): Promise<string[] | null> {
    const chave = `${dataISO}|${normalizar(nomeServico)}`;
    if (!cache.has(chave)) {
        const p = consultar(dataISO, nomeServico);
        cache.set(chave, p);
        // falhas nao ficam no cache: a proxima tentativa consulta de novo
        p.then(r => { if (r === null) cache.delete(chave); });
    }
    return cache.get(chave)!;
}

async function consultar(dataISO: string, nomeServico: string): Promise<string[] | null> {
    const cfg = await config();
    if (!cfg) return null;
    const codigo = cfg.servicos.get(normalizar(nomeServico));
    if (!codigo) return null;

    const [ano, mes, dia] = dataISO.split('-');
    const data = encodeURIComponent(`${dia}/${mes}/${ano}`);
    const url = `https://apiclient.appbarber.com.br/v3/${encodeURIComponent(cfg.empresa)}/schedules/available`
        + `?start_date=${data}%2000:00&end_date=${data}%2023:59`
        + `&service=${encodeURIComponent(codigo)}&combo=`
        + `&client_id=${encodeURIComponent(cfg.clientId)}`
        + `&professional=${encodeURIComponent(cfg.profissional)}`;

    const headers: Record<string, string> = { Accept: 'application/json, text/plain, */*', lang: 'pt-br', 'client-id': cfg.clientId };
    if (cfg.authorization) headers.Authorization = cfg.authorization;
    if (cfg.deviceId) headers['device-id'] = cfg.deviceId;
    if (cfg.clientCode) headers['client-code'] = cfg.clientCode;

    const controle = new AbortController();
    const limite = window.setTimeout(() => controle.abort(), 8000);
    try {
        const res = await fetch(url, { method: 'GET', headers, signal: controle.signal });
        if (!res.ok) return null;
        const dados = (await res.json()) as RespostaApi;
        if (!dados || dados.error || !Array.isArray(dados.schedules)) return null;

        const doCarioca = dados.schedules.filter(s =>
            !cfg.profissional || String(s.employee_code) === String(cfg.profissional));

        const horarios = new Set<string>();
        for (const prof of doCarioca) {
            for (const h of prof.avaliable ?? prof.available ?? []) {
                if (h.scheduling_time) horarios.add(h.scheduling_time.slice(0, 5)); // "14:45:00" -> "14:45"
            }
        }
        return [...horarios].sort();
    } catch (erro) {
        console.warn('Agenda online indisponivel, usando horarios fixos:', erro);
        return null;
    } finally {
        window.clearTimeout(limite);
    }
}
