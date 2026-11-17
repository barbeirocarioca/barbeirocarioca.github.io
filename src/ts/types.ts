export interface Servico {
    id: string;
    nome: string;
    preco: number;
    duracao: number;
    categoria: string;
    desc: string;
    destaque?: boolean;
}

export interface Adicional {
    id: string;
    nome: string;
    preco: number;
    duracao: number;
}

export interface StatusFuncionamento {
    aberto: boolean;
    mensagem: string;
}

export interface DadosConfiguracao {
    barbeariaNome: string;
    whatsappNumero: string;
    whatsappFormatado: string;
    googleMapsUrl: string;
    enderecoTexto: string;
    horarioTexto: string;
    coordenadas: [number, number];
    avisoTexto: string;
}

