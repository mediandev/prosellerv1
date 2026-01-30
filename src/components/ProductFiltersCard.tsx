import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Tag, Layers, Package } from "lucide-react";

const selectClassName =
  "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface ProductFiltersCardProps {
  filterMarca: string;
  filterTipo: string;
  filterSituacao: string;
  onFilterMarcaChange: (value: string) => void;
  onFilterTipoChange: (value: string) => void;
  onFilterSituacaoChange: (value: string) => void;
  marcasDisponiveis: string[];
  tiposDisponiveis: string[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Filtros da lista de produtos usando <select> nativo
 * para evitar restrições do Radix Select (ex.: value vazio).
 */
export function ProductFiltersCard({
  filterMarca,
  filterTipo,
  filterSituacao,
  onFilterMarcaChange,
  onFilterTipoChange,
  onFilterSituacaoChange,
  marcasDisponiveis,
  tiposDisponiveis,
  hasActiveFilters,
  onClearFilters,
}: ProductFiltersCardProps) {
  // Garantir que só opções com valor não vazio sejam usadas (select nativo aceita "", mas evita inconsistência)
  const marcas = marcasDisponiveis.filter((m) => m != null && String(m).trim() !== "");
  const tipos = tiposDisponiveis.filter((t) => t != null && String(t).trim() !== "");

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Filtro Marca - select nativo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Marca
            </label>
            <select
              className={selectClassName}
              value={filterMarca}
              onChange={(e) => onFilterMarcaChange(e.target.value)}
              aria-label="Filtrar por marca"
            >
              <option value="all">Todas as marcas</option>
              {marcas.map((marca) => (
                <option key={marca} value={marca}>
                  {marca}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo - select nativo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Tipo
            </label>
            <select
              className={selectClassName}
              value={filterTipo}
              onChange={(e) => onFilterTipoChange(e.target.value)}
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todos os tipos</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Situação - select nativo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Situação
            </label>
            <select
              className={selectClassName}
              value={filterSituacao}
              onChange={(e) => onFilterSituacaoChange(e.target.value)}
              aria-label="Filtrar por situação"
            >
              <option value="all">Todas as situações</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Excluído">Excluído</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={onClearFilters} type="button">
              Limpar todos os filtros
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
