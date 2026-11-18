import { configApp } from './dataLoader';

/**
 * Mapa do Google Maps incorporado (iframe), sem chave de API, com um unico ponto.
 *  1. Se o link do google.txt tiver o codigo do local (CID), abre exatamente aquela ficha do Google.
 *     (Buscar pelo nome mostrava duas fichas: "MR. FALCONE BARBEARIA" e "Barbearia Mr. Falcone".)
 *  2. Senao, marca as coordenadas do loc.txt.
 */
function cidDoLinkGoogle(url: string): string | null {
    // ...!1s0x94c019c25443e6bf:0x5f445b1142552958!... -> o segundo numero e o CID do local
    const m = url.match(/!1s0x[0-9a-f]+:(0x[0-9a-f]+)/i) || url.match(/[?&]cid=(\d+)/);
    if (!m) return null;
    try {
        return m[1].startsWith('0x') ? BigInt(m[1]).toString() : m[1];
    } catch {
        return null;
    }
}

export function inicializarMapa(lat: number, lng: number): void {
    const mapContainer = document.getElementById('openstreetmap');
    if (!mapContainer) return;

    const cid = cidDoLinkGoogle(configApp.googleMapsUrl || '');
    const src = cid
        ? `https://maps.google.com/maps?cid=${cid}&z=17&hl=pt-BR&output=embed`
        : `https://maps.google.com/maps?q=${lat},${lng}&z=17&hl=pt-BR&output=embed`;

    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = `Mapa: ${configApp.barbeariaNome || 'local de atendimento'} no Google Maps`;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allowFullscreen = true;
    iframe.className = 'map-embed';

    mapContainer.replaceChildren(iframe);
}
