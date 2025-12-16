// Serviço centralizado para gerenciamento de empresas
import { Company } from '../types/company';
import { api } from './api';

/**
 * Serviço para gerenciar empresas com integração ao Supabase
 */
class CompanyService {
  private cache: Company[] | null = null;
  
  /**
   * Carregar todas as empresas do Supabase
   */
  async getAll(): Promise<Company[]> {
    try {
      console.log('[CompanyService] Carregando empresas...');
      const companies = await api.get('empresas');
      
      // MIGRAÇÃO: Garantir que todas as empresas tenham nomeFantasia
      const companiesMigradas = companies.map((empresa: Company) => ({
        ...empresa,
        nomeFantasia: empresa.nomeFantasia?.trim() || empresa.razaoSocial || 'Empresa sem nome',
      }));
      
      this.cache = companiesMigradas;
      console.log('[CompanyService] Empresas carregadas:', companiesMigradas.length);
      return companiesMigradas;
    } catch (error) {
      console.error('[CompanyService] Erro ao carregar empresas do Supabase:', error);
      // Retornar cache se disponível, caso contrário array vazio
      return this.cache || [];
    }
  }
  
  /**
   * Método síncrono para compatibilidade com código existente (usa cache)
   */
  getAllSync(): Company[] {
    return this.cache || [];
  }

  /**
   * Obter uma empresa por ID
   */
  async getById(id: string): Promise<Company | undefined> {
    const companies = await this.getAll();
    return companies.find(c => c.id === id);
  }

  /**
   * Obter empresas ativas
   */
  async getActive(): Promise<Company[]> {
    const companies = await this.getAll();
    return companies.filter(c => c.ativo);
  }

  /**
   * Adicionar nova empresa
   */
  async add(company: Omit<Company, 'id' | 'dataCadastro'>): Promise<Company> {
    try {
      const newCompany: Company = {
        ...company,
        id: Date.now().toString(),
        dataCadastro: new Date().toISOString().split('T')[0],
      } as Company;

      console.log('[CompanyService] Adicionando empresa:', newCompany);
      const created = await api.create('empresas', newCompany);
      
      // Atualizar cache
      await this.getAll();
      
      // Disparar evento customizado para notificar componentes sobre a mudança
      window.dispatchEvent(new CustomEvent('companiesChanged'));
      
      return created;
    } catch (error) {
      console.error('[CompanyService] Erro ao adicionar empresa:', error);
      throw error;
    }
  }

  /**
   * Atualizar empresa existente
   */
  async update(id: string, updates: Partial<Company>): Promise<Company | null> {
    try {
      console.log('[CompanyService] Atualizando empresa:', id, updates);
      const updated = await api.update('empresas', id, updates);
      
      // Atualizar cache
      await this.getAll();
      
      // Disparar evento customizado para notificar componentes sobre a mudança
      window.dispatchEvent(new CustomEvent('companiesChanged'));
      
      return updated;
    } catch (error) {
      console.error('[CompanyService] Erro ao atualizar empresa:', error);
      return null;
    }
  }

  /**
   * Remover empresa
   */
  async delete(id: string): Promise<boolean> {
    try {
      console.log('[CompanyService] Removendo empresa:', id);
      await api.delete('empresas', id);
      
      // Atualizar cache
      await this.getAll();
      
      // Disparar evento customizado para notificar componentes sobre a mudança
      window.dispatchEvent(new CustomEvent('companiesChanged'));
      
      return true;
    } catch (error) {
      console.error('[CompanyService] Erro ao remover empresa:', error);
      return false;
    }
  }

  /**
   * Verificar se uma empresa existe por CNPJ
   */
  async existsByCNPJ(cnpj: string, excludeId?: string): Promise<boolean> {
    const companies = await this.getAll();
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    return companies.some(c => {
      const companyCleanCNPJ = c.cnpj.replace(/\D/g, '');
      return companyCleanCNPJ === cleanCNPJ && c.id !== excludeId;
    });
  }

  /**
   * Obter estatísticas das empresas
   */
  async getStatistics() {
    const companies = await this.getAll();
    
    return {
      total: companies.length,
      ativas: companies.filter(c => c.ativo).length,
      inativas: companies.filter(c => !c.ativo).length,
      comIntegracaoERP: companies.filter(c => 
        c.integracoesERP && Array.isArray(c.integracoesERP) && c.integracoesERP.some(erp => erp.ativo)
      ).length,
    };
  }
}

// Singleton
export const companyService = new CompanyService();