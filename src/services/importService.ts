import { ImportHistory, TipoImportacao } from '../types/importHistory';

// Armazena os IDs dos registros importados para permitir rollback
interface ImportedRecords {
  importId: string;
  recordIds: string[];
  tipo: TipoImportacao;
  canUndo: boolean;
}

// Simula um banco de dados de registros importados
const importedRecordsStore: Map<string, ImportedRecords> = new Map();

// Armazena os dados originais para rollback
const rollbackDataStore: Map<string, any[]> = new Map();

export const importService = {
  // Registra uma importação com os IDs dos registros criados
  registerImport: (importId: string, tipo: TipoImportacao, recordIds: string[]) => {
    importedRecordsStore.set(importId, {
      importId,
      recordIds,
      tipo,
      canUndo: true,
    });
  },

  // Salva os dados originais antes da importação para permitir rollback
  saveRollbackData: (importId: string, data: any[]) => {
    rollbackDataStore.set(importId, data);
  },

  // Verifica se uma importação pode ser desfeita
  canUndo: (importId: string): boolean => {
    const record = importedRecordsStore.get(importId);
    return record?.canUndo ?? false;
  },

  // Desfaz uma importação removendo os registros importados
  undoImport: (importId: string): { success: boolean; removedCount: number; error?: string } => {
    const record = importedRecordsStore.get(importId);
    
    if (!record) {
      return { success: false, removedCount: 0, error: 'Importação não encontrada' };
    }

    if (!record.canUndo) {
      return { success: false, removedCount: 0, error: 'Importação não pode ser desfeita' };
    }

    try {
      // Em um sistema real, aqui você removeria os registros do banco de dados
      // Para este mockup, apenas simulamos a remoção
      const removedCount = record.recordIds.length;

      // Marca a importação como desfeita
      importedRecordsStore.set(importId, {
        ...record,
        canUndo: false,
      });

      // Remove os dados de rollback para liberar memória
      rollbackDataStore.delete(importId);

      return { success: true, removedCount };
    } catch (error) {
      return { 
        success: false, 
        removedCount: 0, 
        error: 'Erro ao desfazer importação: ' + (error as Error).message 
      };
    }
  },

  // Obtém informações sobre uma importação
  getImportInfo: (importId: string): ImportedRecords | null => {
    return importedRecordsStore.get(importId) ?? null;
  },

  // Marca uma importação como não reversível (após certo tempo ou condições)
  markAsNonReversible: (importId: string): void => {
    const record = importedRecordsStore.get(importId);
    if (record) {
      importedRecordsStore.set(importId, {
        ...record,
        canUndo: false,
      });
    }
  },

  // Limpa registros antigos de importações
  cleanup: (olderThanHours: number = 24): void => {
    // Em um sistema real, você verificaria a data/hora e removeria registros antigos
    // Para este mockup, apenas mantemos a interface
  },

  // Obtém estatísticas de uma importação
  getImportStats: (importId: string): { totalRecords: number; canUndo: boolean } | null => {
    const record = importedRecordsStore.get(importId);
    if (!record) return null;

    return {
      totalRecords: record.recordIds.length,
      canUndo: record.canUndo,
    };
  },
};

// Simula alguns registros de importação para demonstração
importService.registerImport('imp-1', 'clientes', ['cli-101', 'cli-102', 'cli-103', 'cli-104']);
importService.registerImport('imp-2', 'produtos', Array.from({ length: 120 }, (_, i) => `prod-${200 + i}`));
importService.registerImport('imp-3', 'vendas', Array.from({ length: 295 }, (_, i) => `venda-${300 + i}`));
importService.registerImport('imp-4', 'vendedores', ['vend-50', 'vend-51', 'vend-52']);

// Marca imp-4 como não reversível (exemplo de importação mais antiga)
// importService.markAsNonReversible('imp-4');
