/**
 * Carrossel infinito de parcerias, lido de public/parcerias.txt.
 * Uma fileira de logos; a fileira repete os itens ate passar da largura da tela
 * e depois duplica o conjunto, para o loop (translateX 0 -> -50%) nao ter emenda.
 * Pausa ao passar o mouse, ao focar com o teclado e pelo botao; parado com "reduzir movimento".
 */

interface Parceria {
    nome: string;
    logo?: string;
    link?: string;
}

export function parseParceriasTxt(texto: string): Parceria[] {
    return texto
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => {
            const [nome, logo, link] = l.split('|').map(p => p.trim());
            return { nome, logo: logo || undefined, link: link || undefined };
        })
        .filter(p => p.nome);
}

function escapar(t: string): string {
    return t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function iniciais(nome: string): string {
    return nome
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
}

/**
 * Endereco do logo:
 *  - https://...                      -> usado como esta
 *  - caminho com pasta (assets/x.jpg) -> a partir da raiz do site (pasta public/)
 *  - so o nome do arquivo (x.png)     -> dentro de public/parceiros/
 */
function srcDoLogo(logo: string): string {
    if (/^https?:\/\//.test(logo)) return logo;
    if (logo.includes('/')) return '/' + logo.replace(/^(\.{1,2}\/|\/)+/, '').replace(/^public\//, '');
    return `/parceiros/${logo}`;
}

function htmlDoItem(p: Parceria, decorativo: boolean): string {
    const marca = p.logo
        ? `<span class="partner__logo-wrap"><img class="partner__logo" src="${escapar(srcDoLogo(p.logo))}" alt="${escapar(p.nome)}" loading="lazy"></span>`
        : `<span class="partner__mark" aria-hidden="true">${escapar(iniciais(p.nome))}</span>`;
    // com logo, o nome fica so para leitor de tela (o alt da imagem); sem logo, o nome vira a marca escrita
    const conteudo = p.logo ? marca : `${marca}<span class="partner__name">${escapar(p.nome)}</span>`;
    // copias que so existem para fechar o loop ficam fora do leitor de tela e do Tab
    const a11y = decorativo ? ' aria-hidden="true" tabindex="-1"' : '';
    return p.link
        ? `<li class="partner-li"${decorativo ? ' aria-hidden="true"' : ''}><a class="partner" href="${escapar(p.link)}" target="_blank" rel="noopener"${a11y}>${conteudo}</a></li>`
        : `<li class="partner-li"${decorativo ? ' aria-hidden="true"' : ''}><span class="partner">${conteudo}</span></li>`;
}

function montarFileira(trilho: HTMLElement, lista: Parceria[]): void {
    // repete a lista ate o conjunto ter pelo menos ~10 itens (cobre telas largas)
    const conjunto: Parceria[] = [];
    while (conjunto.length < Math.max(10, lista.length)) conjunto.push(...lista);

    const primeiro = conjunto.map((p, i) => htmlDoItem(p, i >= lista.length)).join('');
    const copia = conjunto.map(p => htmlDoItem(p, true)).join('');
    trilho.innerHTML = primeiro + copia;
    // velocidade constante: ~5s por item do conjunto
    trilho.style.setProperty('--marquee-dur', `${conjunto.length * 4}s`);
}

export async function carregarParcerias(): Promise<void> {
    const secao = document.getElementById('parcerias');
    if (!secao) return;

    let lista: Parceria[] = [];
    try {
        const res = await fetch('parcerias.txt');
        if (res.ok) lista = parseParceriasTxt(await res.text());
    } catch {
        console.warn('parcerias.txt indisponivel');
    }

    if (!lista.length) {
        secao.classList.add('hidden');
        return;
    }

    const trilhos = secao.querySelectorAll<HTMLElement>('[data-marquee-track]');
    trilhos.forEach((t, i) => montarFileira(t, i % 2 === 0 ? lista : [...lista].reverse()));
    secao.classList.remove('hidden');

    // logo que nao carrega vira as iniciais
    secao.querySelectorAll<HTMLImageElement>('img.partner__logo').forEach(img => {
        img.addEventListener('error', () => {
            const nome = img.alt || '';
            const span = document.createElement('span');
            span.className = 'partner__mark';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = iniciais(nome);
            const wrap = img.closest('.partner__logo-wrap') || img;
            const nomeEl = document.createElement('span');
            nomeEl.className = 'partner__name';
            nomeEl.textContent = nome;
            wrap.replaceWith(span, nomeEl);
        }, { once: true });
    });

    padronizarLogos(secao);

    const botao = secao.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
    botao?.addEventListener('click', () => {
        const pausado = secao.classList.toggle('is-paused');
        botao.setAttribute('aria-pressed', String(pausado));
        botao.setAttribute('aria-label', pausado ? 'Retomar animação das parcerias' : 'Pausar animação das parcerias');
        const icone = botao.querySelector('i');
        if (icone) icone.className = pausado ? 'fa-solid fa-play' : 'fa-solid fa-pause';
    });
}

/* ------------------------------------------------------------------
 * Padronizacao dos logos
 * Cada logo e lido num canvas: a cor do fundo (os cantos da imagem) vira
 * transparente e a margem vazia em volta do desenho e recortada. Assim todo
 * logo, seja JPG com fundo, PNG com sobra ou SVG, ocupa a mesma caixa
 * (.partner__logo-wrap) com o mesmo tamanho visual.
 * Se a imagem vier de outro dominio sem permissao (CORS), ela fica como esta.
 * ------------------------------------------------------------------ */
interface LogoPadrao { url: string; largura: number; altura: number; tinta: number; }
const cacheLogos = new Map<string, Promise<LogoPadrao | null>>();

function carregarImagem(src: string): Promise<HTMLImageElement> {
    return new Promise((ok, erro) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => ok(im);
        im.onerror = erro;
        im.src = src;
    });
}

async function logoPadronizado(src: string): Promise<LogoPadrao | null> {
    const im = await carregarImagem(src);
    const maior = 600; // reduz arquivos enormes antes de processar
    const escala = Math.min(1, maior / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * escala));
    const h = Math.max(1, Math.round(im.naturalHeight * escala));

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(im, 0, 0, w, h);

    let dados: ImageData;
    try {
        dados = ctx.getImageData(0, 0, w, h);
    } catch {
        return null; // imagem de outro dominio: sem acesso aos pixels
    }
    const px = dados.data;

    // cor de fundo = media dos quatro cantos
    const cantos = [0, w - 1, (h - 1) * w, h * w - 1].map(i => i * 4);
    const fundo = [0, 1, 2].map(c => cantos.reduce((s, i) => s + px[i + c], 0) / 4);
    const fundoTransparente = cantos.every(i => px[i + 3] < 16);

    let x0 = w, y0 = h, x1 = -1, y1 = -1, cheios = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const dist = Math.max(
                Math.abs(px[i] - fundo[0]),
                Math.abs(px[i + 1] - fundo[1]),
                Math.abs(px[i + 2] - fundo[2])
            );
            const vazio = fundoTransparente ? px[i + 3] < 16 : dist < 28;
            if (vazio) {
                px[i + 3] = 0;
            } else {
                cheios++;
                if (!fundoTransparente && dist < 60) {
                    // borda suave entre desenho e fundo
                    px[i + 3] = Math.round(px[i + 3] * (dist - 28) / 32);
                }
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    if (x1 < 0) return null; // imagem toda vazia

    ctx.putImageData(dados, 0, 0);
    const respiro = 2;
    x0 = Math.max(0, x0 - respiro); y0 = Math.max(0, y0 - respiro);
    x1 = Math.min(w - 1, x1 + respiro); y1 = Math.min(h - 1, y1 + respiro);

    const corte = document.createElement('canvas');
    corte.width = x1 - x0 + 1;
    corte.height = y1 - y0 + 1;
    corte.getContext('2d')?.drawImage(cv, x0, y0, corte.width, corte.height, 0, 0, corte.width, corte.height);
    // tinta = quanto da caixa recortada o desenho preenche (logo fino ~0.15, logo grosso ~0.5)
    const tinta = cheios / (corte.width * corte.height);
    return { url: corte.toDataURL('image/png'), largura: corte.width, altura: corte.height, tinta };
}

function padronizarLogos(secao: HTMLElement): void {
    secao.querySelectorAll<HTMLImageElement>('img.partner__logo').forEach(img => {
        const src = img.currentSrc || img.src;
        if (!src) return;
        if (!cacheLogos.has(src)) cacheLogos.set(src, logoPadronizado(src).catch(() => null));
        cacheLogos.get(src)!.then(logo => {
            if (logo) {
                img.src = logo.url;
                const { largura, altura } = tamanhoEquilibrado(logo);
                img.style.width = largura + 'px';
                img.style.height = altura + 'px';
            }
            img.classList.add('is-standard'); // sem recorte possivel, o logo aparece como esta
        });
    });
}

/**
 * Tamanho visual equilibrado: todos os logos recebem a mesma area, corrigida pela tinta
 * (logo de traco fino cresce um pouco, logo grosso diminui), dentro de limites da caixa.
 */
function tamanhoEquilibrado(logo: LogoPadrao): { largura: number; altura: number } {
    const celular = matchMedia('(max-width: 639px)').matches;
    const areaBase = celular ? 6048 : 10368;          // px² de referencia (+20% nas medidas)
    const maxL = celular ? 180 : 240, maxA = celular ? 67 : 91;
    const proporcao = logo.largura / logo.altura;
    const ajusteTinta = Math.min(1.6, Math.max(0.75, Math.sqrt(0.3 / Math.max(0.05, logo.tinta))));
    let altura = Math.sqrt((areaBase * ajusteTinta) / proporcao);
    let largura = altura * proporcao;
    const reducao = Math.min(1, maxL / largura, maxA / altura);
    altura *= reducao; largura *= reducao;
    return { largura: Math.round(largura), altura: Math.round(altura) };
}
