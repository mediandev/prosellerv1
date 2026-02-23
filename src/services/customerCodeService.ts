import { Cliente } from '../types/customer';

export interface CustomerCodeConfig {
  modo: 'automatico' | 'manual';
  proximoCodigo?: number;
}

export interface CodigoResolvido {
  codigo: string;
  origem: 'tiny_dap' | 'tiny_cantico' | 'sequencial' | 'manual';
  tinySistema?: 'dap' | 'cantico';
  tinyIdExterno?: string;
}

const STORAGE_KEY = 'customer_code_config';

class CustomerCodeService {
  obterConfiguracao(): CustomerCodeConfig {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    return { modo: 'manual' };
  }

  salvarConfiguracao(config: CustomerCodeConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  alterarModo(modo: 'automatico' | 'manual', clientesExistentes: Cliente[]): CustomerCodeConfig {
    const config: CustomerCodeConfig = { modo };

    if (modo === 'automatico') {
      const maiorCodigo = this.encontrarMaiorCodigo(clientesExistentes);
      config.proximoCodigo = maiorCodigo + 1;
    }

    this.salvarConfiguracao(config);
    return config;
  }

  private normalizarCodigo(codigo?: string | null): string {
    return (codigo || '').trim();
  }

  private extrairTinyDap(cliente: any): string | null {
    const candidatos = [
      cliente?.codigoTinyDap,
      cliente?.codigo_tiny_dap,
      cliente?.integracaoERP?.tiny?.dap?.codigoCliente,
      cliente?.integracaoERP?.tiny?.dap?.codigo,
      cliente?.tiny?.dap?.codigo,
    ];
    const codigo = candidatos.find((v) => typeof v === 'string' && v.trim() !== '');
    return codigo ? String(codigo).trim() : null;
  }

  private extrairTinyCantico(cliente: any): string | null {
    const candidatos = [
      cliente?.codigoTinyCantico,
      cliente?.codigo_tiny_cantico,
      cliente?.integracaoERP?.tiny?.cantico?.codigoCliente,
      cliente?.integracaoERP?.tiny?.cantico?.codigo,
      cliente?.tiny?.cantico?.codigo,
    ];
    const codigo = candidatos.find((v) => typeof v === 'string' && v.trim() !== '');
    return codigo ? String(codigo).trim() : null;
  }

  private codigoEmUso(codigo: string, clienteId: string, clientesExistentes: Cliente[]): boolean {
    const normalizado = this.normalizarCodigo(codigo);
    if (!normalizado) return false;

    return clientesExistentes.some((c) => {
      if (!c || c.id === clienteId) return false;
      return this.normalizarCodigo(c.codigo) === normalizado;
    });
  }

  encontrarMaiorCodigo(clientes: Cliente[]): number {
    let maiorCodigo = 0;

    clientes.forEach((cliente) => {
      const codigo = this.normalizarCodigo(cliente.codigo);
      if (!/^\d+$/.test(codigo)) return;
      const codigoNumerico = parseInt(codigo, 10);
      if (!isNaN(codigoNumerico) && codigoNumerico > maiorCodigo) {
        maiorCodigo = codigoNumerico;
      }
    });

    return maiorCodigo;
  }

  private proximoSequencialUnico(clienteId: string, clientesExistentes: Cliente[]): string {
    const config = this.obterConfiguracao();
    const base = Math.max(config.proximoCodigo || 1, this.encontrarMaiorCodigo(clientesExistentes) + 1);

    let atual = base;
    while (this.codigoEmUso(String(atual).padStart(6, '0'), clienteId, clientesExistentes)) {
      atual += 1;
    }

    config.proximoCodigo = atual + 1;
    this.salvarConfiguracao(config);

    return String(atual).padStart(6, '0');
  }

  gerarProximoCodigo(): string | null {
    const config = this.obterConfiguracao();
    if (config.modo !== 'automatico') return null;

    const proximoCodigo = config.proximoCodigo || 1;
    config.proximoCodigo = proximoCodigo + 1;
    this.salvarConfiguracao(config);

    return String(proximoCodigo).padStart(6, '0');
  }

  resolverCodigoComPrioridade(
    cliente: Partial<Cliente> & Record<string, any>,
    clienteId: string,
    clientesExistentes: Cliente[]
  ): { valido: boolean; resultado?: CodigoResolvido; erro?: string } {
    const tinyDap = this.extrairTinyDap(cliente);
    if (tinyDap && !this.codigoEmUso(tinyDap, clienteId, clientesExistentes)) {
      return {
        valido: true,
        resultado: {
          codigo: tinyDap,
          origem: 'tiny_dap',
          tinySistema: 'dap',
          tinyIdExterno: tinyDap,
        },
      };
    }

    const tinyCantico = this.extrairTinyCantico(cliente);
    if (tinyCantico && !this.codigoEmUso(tinyCantico, clienteId, clientesExistentes)) {
      return {
        valido: true,
        resultado: {
          codigo: tinyCantico,
          origem: 'tiny_cantico',
          tinySistema: 'cantico',
          tinyIdExterno: tinyCantico,
        },
      };
    }

    const manual = this.normalizarCodigo(cliente.codigo);
    if (manual) {
      if (this.codigoEmUso(manual, clienteId, clientesExistentes)) {
        return {
          valido: false,
          erro: 'Este codigo ja esta sendo utilizado por outro cliente',
        };
      }
      return {
        valido: true,
        resultado: {
          codigo: manual,
          origem: 'manual',
        },
      };
    }

    const sequencial = this.proximoSequencialUnico(clienteId, clientesExistentes);
    return {
      valido: true,
      resultado: {
        codigo: sequencial,
        origem: 'sequencial',
      },
    };
  }

  atribuirCodigosAutomaticos(clientes: Cliente[]): Cliente[] {
    const config = this.obterConfiguracao();
    if (config.modo !== 'automatico') return clientes;

    return clientes.map((cliente) => {
      if (this.normalizarCodigo(cliente.codigo)) {
        return cliente;
      }

      const resolucao = this.resolverCodigoComPrioridade(cliente, cliente.id, clientes);
      return {
        ...cliente,
        codigo: resolucao.resultado?.codigo,
      };
    });
  }

  validarCodigoManual(codigo: string, clienteId: string, clientesExistentes: Cliente[]): {
    valido: boolean;
    erro?: string;
  } {
    const normalizado = this.normalizarCodigo(codigo);
    if (!normalizado) {
      return {
        valido: false,
        erro: 'Codigo do cliente e obrigatorio no modo manual',
      };
    }

    if (this.codigoEmUso(normalizado, clienteId, clientesExistentes)) {
      return {
        valido: false,
        erro: 'Este codigo ja esta sendo utilizado por outro cliente',
      };
    }

    return { valido: true };
  }

  formatarCodigo(codigo: string | undefined): string {
    if (!codigo) return '---';
    return codigo;
  }

  ehModoAutomatico(): boolean {
    const config = this.obterConfiguracao();
    return config.modo === 'automatico';
  }
}

export const customerCodeService = new CustomerCodeService();
