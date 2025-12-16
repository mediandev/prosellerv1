// Serviço para gerenciar códigos de clientes
import { Cliente } from '../types/customer';

export interface CustomerCodeConfig {
  modo: 'automatico' | 'manual';
  proximoCodigo?: number; // Usado quando modo é automático
}

const STORAGE_KEY = 'customer_code_config';

class CustomerCodeService {
  /**
   * Obter configuração atual
   */
  obterConfiguracao(): CustomerCodeConfig {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Configuração padrão: manual
    return {
      modo: 'manual',
    };
  }

  /**
   * Salvar configuração
   */
  salvarConfiguracao(config: CustomerCodeConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  /**
   * Alterar modo de geração de código
   */
  alterarModo(modo: 'automatico' | 'manual', clientesExistentes: Cliente[]): CustomerCodeConfig {
    const config: CustomerCodeConfig = {
      modo,
    };

    if (modo === 'automatico') {
      // Encontrar o maior código existente
      const maiorCodigo = this.encontrarMaiorCodigo(clientesExistentes);
      config.proximoCodigo = maiorCodigo + 1;
    }

    this.salvarConfiguracao(config);
    return config;
  }

  /**
   * Encontrar o maior código numérico existente
   */
  encontrarMaiorCodigo(clientes: Cliente[]): number {
    let maiorCodigo = 0;

    clientes.forEach(cliente => {
      if (cliente.codigo) {
        // Tentar converter para número
        const codigoNumerico = parseInt(cliente.codigo, 10);
        if (!isNaN(codigoNumerico) && codigoNumerico > maiorCodigo) {
          maiorCodigo = codigoNumerico;
        }
      }
    });

    return maiorCodigo;
  }

  /**
   * Gerar próximo código automático
   */
  gerarProximoCodigo(): string | null {
    const config = this.obterConfiguracao();

    if (config.modo !== 'automatico') {
      return null;
    }

    const proximoCodigo = config.proximoCodigo || 1;
    
    // Atualizar configuração com o próximo código
    config.proximoCodigo = proximoCodigo + 1;
    this.salvarConfiguracao(config);

    // Retornar código formatado com zeros à esquerda (6 dígitos)
    return String(proximoCodigo).padStart(6, '0');
  }

  /**
   * Atribuir códigos automáticos para clientes existentes sem código
   */
  atribuirCodigosAutomaticos(clientes: Cliente[]): Cliente[] {
    const config = this.obterConfiguracao();

    if (config.modo !== 'automatico') {
      return clientes;
    }

    let proximoCodigo = config.proximoCodigo || 1;
    const clientesAtualizados: Cliente[] = [];

    clientes.forEach(cliente => {
      if (!cliente.codigo || cliente.codigo.trim() === '') {
        // Atribuir código automático
        const novoCodigo = String(proximoCodigo).padStart(6, '0');
        clientesAtualizados.push({
          ...cliente,
          codigo: novoCodigo,
        });
        proximoCodigo++;
      } else {
        clientesAtualizados.push(cliente);
      }
    });

    // Atualizar configuração com o próximo código disponível
    config.proximoCodigo = proximoCodigo;
    this.salvarConfiguracao(config);

    return clientesAtualizados;
  }

  /**
   * Validar código manual (verificar se já existe)
   */
  validarCodigoManual(codigo: string, clienteId: string, clientesExistentes: Cliente[]): {
    valido: boolean;
    erro?: string;
  } {
    if (!codigo || codigo.trim() === '') {
      return {
        valido: false,
        erro: 'Código do cliente é obrigatório no modo manual',
      };
    }

    // Verificar se já existe outro cliente com o mesmo código
    const codigoExiste = clientesExistentes.some(
      c => c.codigo === codigo && c.id !== clienteId
    );

    if (codigoExiste) {
      return {
        valido: false,
        erro: 'Este código já está sendo utilizado por outro cliente',
      };
    }

    return { valido: true };
  }

  /**
   * Formatar código para exibição
   */
  formatarCodigo(codigo: string | undefined): string {
    if (!codigo) return '---';
    return codigo;
  }

  /**
   * Verificar se modo é automático
   */
  ehModoAutomatico(): boolean {
    const config = this.obterConfiguracao();
    return config.modo === 'automatico';
  }
}

// Singleton
export const customerCodeService = new CustomerCodeService();
