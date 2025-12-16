import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImportSalesData } from './ImportSalesData';
import { ImportCustomersData } from './ImportCustomersData';
import { ImportProductsData } from './ImportProductsData';
import { ImportSellersData } from './ImportSellersData';
import { ImportHistoryView } from './ImportHistoryView';
import { DataExportSettings } from './DataExportSettings';
import { ShoppingCart, UserCircle, Package, Users, History, Download, Upload } from 'lucide-react';

export function DataImportSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg">Importação e Exportação de Dados</h2>
        <p className="text-sm text-muted-foreground">
          Importe e exporte dados em massa via planilhas Excel
        </p>
      </div>

      <Tabs defaultValue="vendas" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="vendas" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Vendas</span>
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="produtos" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Produtos</span>
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Vendedores</span>
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="exportar" className="flex items-center gap-2 col-span-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar Dados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-6">
          <ImportSalesData />
        </TabsContent>

        <TabsContent value="clientes" className="mt-6">
          <ImportCustomersData />
        </TabsContent>

        <TabsContent value="produtos" className="mt-6">
          <ImportProductsData />
        </TabsContent>

        <TabsContent value="vendedores" className="mt-6">
          <ImportSellersData />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <ImportHistoryView />
        </TabsContent>

        <TabsContent value="exportar" className="mt-6">
          <DataExportSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
