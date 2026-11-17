import { configApp } from './dataLoader';

declare const L: any;

export function inicializarMapa(lat: number, lng: number): void {
    const mapContainer = document.getElementById('openstreetmap');
    if (!mapContainer) return;

    if (typeof L === 'undefined') {
        console.warn('Leaflet nao carregado ainda.');
        return;
    }

    try {
        const map = L.map('openstreetmap').setView([lat, lng], 16);

        L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(map);

        const customPopup = `
            <div class="text-center font-sans p-1">
                <strong class="font-bold text-xs text-charcoal block">Carioca — Barbeiro Especialista &amp; Visagista</strong>
                <span class="text-[11px] text-gray-700 block mt-0.5">Espaço atual: <strong class="txt-barbearia">${configApp.barbeariaNome}</strong></span>
                <span class="text-[10px] text-gray-500 block">Em frente ao Pão de Açúcar</span>
                <button type="button" onclick="window.abrirGoogleMaps()" class="mt-2 px-3 py-1 bg-moss-700 text-white text-[10px] rounded-lg font-bold uppercase tracking-wider">
                    Ver Rota
                </button>
            </div>
        `;

        L.marker([lat, lng]).addTo(map)
            .bindPopup(customPopup)
            .openPopup();
    } catch (err) {
        console.warn('Erro ao inicializar mapa:', err);
    }
}

