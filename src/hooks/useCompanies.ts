import { useState, useEffect, useCallback } from 'react';
import { Company } from '../types/company';
import { companyService } from '../services/companyService';

/**
 * Hook personalizado para gerenciar empresas com reatividade
 */
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    total: 0,
    ativas: 0,
    inativas: 0,
    comIntegracaoERP: 0,
  });

  // Recarregar empresas
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[useCompanies] Carregando empresas...');
      const data = await companyService.getAll();
      setCompanies(data);
      
      const stats = await companyService.getStatistics();
      setStatistics(stats);
      
      console.log('[useCompanies] Empresas carregadas:', data.length);
    } catch (error) {
      console.error('[useCompanies] Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Escutar mudanças nas empresas (eventos customizados)
  useEffect(() => {
    const handleCompaniesChange = () => {
      reload();
    };
    
    // Escutar evento customizado de mudança de empresas
    window.addEventListener('companiesChanged', handleCompaniesChange);

    // Recarregar quando o componente montar
    reload();

    return () => {
      window.removeEventListener('companiesChanged', handleCompaniesChange);
    };
  }, [reload]);

  // Adicionar empresa
  const addCompany = useCallback(async (company: Omit<Company, 'id' | 'dataCadastro'>) => {
    try {
      const newCompany = await companyService.add(company);
      await reload();
      return newCompany;
    } catch (error) {
      console.error('[useCompanies] Erro ao adicionar empresa:', error);
      throw error;
    }
  }, [reload]);

  // Atualizar empresa
  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    try {
      const updated = await companyService.update(id, updates);
      await reload();
      return updated;
    } catch (error) {
      console.error('[useCompanies] Erro ao atualizar empresa:', error);
      return null;
    }
  }, [reload]);

  // Remover empresa
  const deleteCompany = useCallback(async (id: string) => {
    try {
      const success = await companyService.delete(id);
      await reload();
      return success;
    } catch (error) {
      console.error('[useCompanies] Erro ao remover empresa:', error);
      return false;
    }
  }, [reload]);

  // Obter empresa por ID
  const getById = useCallback((id: string) => {
    return companies.find(c => c.id === id);
  }, [companies]);

  // Obter empresas ativas
  const getActive = useCallback(() => {
    return companies.filter(c => c.ativo);
  }, [companies]);

  return {
    companies,
    loading,
    reload,
    addCompany,
    updateCompany,
    deleteCompany,
    getById,
    getActive,
    statistics,
  };
}
