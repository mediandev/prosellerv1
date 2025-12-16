import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { DashboardFilters } from "./DashboardMetrics";
import { useAuth } from "../contexts/AuthContext";
import { Transaction } from "../services/dashboardDataService";

interface Sale {
  id: string;
  cliente: string;
  vendedor: string;
  valor: string;
  status: "concluída" | "em_andamento" | "pendente";
  data: string;
  natureza: string;
  segmento: string;
  statusCliente: string;
  grupoRede?: string;
}

const recentSalesByPeriod: Record<string, Sale[]> = {
  "7": [
    {
      id: "#VD-1240",
      cliente: "Startup Inovação",
      vendedor: "Pedro Costa",
      valor: "R$ 9.800",
      status: "concluída",
      data: "20/10/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1241",
      cliente: "Tech Solutions",
      vendedor: "João Silva",
      valor: "R$ 5.200",
      status: "concluída",
      data: "20/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1242",
      cliente: "Innovation Labs",
      vendedor: "Maria Santos",
      valor: "R$ 3.000",
      status: "concluída",
      data: "20/10/2025",
      natureza: "Locação",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1239",
      cliente: "Grupo Omega",
      vendedor: "João Silva",
      valor: "R$ 15.200",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Revenda",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1243",
      cliente: "Business Pro",
      vendedor: "Carlos Oliveira",
      valor: "R$ 8.500",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1244",
      cliente: "Corp ABC",
      vendedor: "Ana Paula",
      valor: "R$ 4.200",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Demonstração",
      segmento: "Standard",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1238",
      cliente: "Digital Hub",
      vendedor: "Maria Santos",
      valor: "R$ 6.500",
      status: "concluída",
      data: "18/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1245",
      cliente: "Innovation Labs",
      vendedor: "Pedro Costa",
      valor: "R$ 12.300",
      status: "concluída",
      data: "18/10/2025",
      natureza: "Venda Direta",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1246",
      cliente: "Future Tech",
      vendedor: "João Silva",
      valor: "R$ 7.800",
      status: "concluída",
      data: "18/10/2025",
      natureza: "Revenda",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1237",
      cliente: "Tech Ventures",
      vendedor: "Carlos Oliveira",
      valor: "R$ 11.200",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1247",
      cliente: "Smart Solutions",
      vendedor: "Ana Paula",
      valor: "R$ 9.400",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Serviço",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1248",
      cliente: "Grupo Omega",
      vendedor: "Maria Santos",
      valor: "R$ 6.200",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Locação",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1236",
      cliente: "Business Pro",
      vendedor: "Ana Paula",
      valor: "R$ 8.700",
      status: "concluída",
      data: "16/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1249",
      cliente: "Tech Solutions",
      vendedor: "Pedro Costa",
      valor: "R$ 5.600",
      status: "concluída",
      data: "16/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1250",
      cliente: "Digital Corp",
      vendedor: "João Silva",
      valor: "R$ 4.200",
      status: "concluída",
      data: "16/10/2025",
      natureza: "Locação",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1235",
      cliente: "Innovation Labs",
      vendedor: "Pedro Costa",
      valor: "R$ 19.850",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Demonstração",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1251",
      cliente: "Global Trade",
      vendedor: "Carlos Oliveira",
      valor: "R$ 7.300",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Revenda",
      segmento: "PME",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1252",
      cliente: "Smart Solutions",
      vendedor: "Maria Santos",
      valor: "R$ 3.950",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Serviço",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1234",
      cliente: "Startup Inovação",
      vendedor: "Ana Paula",
      valor: "R$ 8.900",
      status: "concluída",
      data: "14/10/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1253",
      cliente: "Global Systems",
      vendedor: "João Silva",
      valor: "R$ 11.200",
      status: "concluída",
      data: "14/10/2025",
      natureza: "Locação",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1254",
      cliente: "Future Tech",
      vendedor: "Pedro Costa",
      valor: "R$ 5.400",
      status: "concluída",
      data: "14/10/2025",
      natureza: "Revenda",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
  ],
  "30": [
    {
      id: "#VD-1240",
      cliente: "Startup Inovação",
      vendedor: "Pedro Costa",
      valor: "R$ 9.800",
      status: "concluída",
      data: "20/10/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1241",
      cliente: "Tech Solutions",
      vendedor: "João Silva",
      valor: "R$ 5.200",
      status: "concluída",
      data: "20/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1242",
      cliente: "Innovation Labs",
      vendedor: "Maria Santos",
      valor: "R$ 3.000",
      status: "concluída",
      data: "20/10/2025",
      natureza: "Locação",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1239",
      cliente: "Grupo Omega",
      vendedor: "João Silva",
      valor: "R$ 15.200",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Revenda",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1243",
      cliente: "Business Pro",
      vendedor: "Carlos Oliveira",
      valor: "R$ 8.500",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1244",
      cliente: "Corp ABC",
      vendedor: "Ana Paula",
      valor: "R$ 4.200",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Demonstração",
      segmento: "Standard",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1238",
      cliente: "Digital Hub",
      vendedor: "Maria Santos",
      valor: "R$ 6.500",
      status: "concluída",
      data: "18/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1245",
      cliente: "Innovation Labs",
      vendedor: "Pedro Costa",
      valor: "R$ 12.300",
      status: "concluída",
      data: "18/10/2025",
      natureza: "Venda Direta",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1246",
      cliente: "Future Tech",
      vendedor: "João Silva",
      valor: "R$ 7.800",
      status: "concluída",
      data: "18/10/2025",
      natureza: "Revenda",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1237",
      cliente: "Tech Ventures",
      vendedor: "Carlos Oliveira",
      valor: "R$ 11.200",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1247",
      cliente: "Smart Solutions",
      vendedor: "Ana Paula",
      valor: "R$ 9.400",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Serviço",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1248",
      cliente: "Grupo Omega",
      vendedor: "Maria Santos",
      valor: "R$ 6.200",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Locação",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1236",
      cliente: "Business Pro",
      vendedor: "Ana Paula",
      valor: "R$ 8.700",
      status: "concluída",
      data: "16/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1249",
      cliente: "Tech Solutions",
      vendedor: "Pedro Costa",
      valor: "R$ 5.600",
      status: "concluída",
      data: "16/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1250",
      cliente: "Digital Corp",
      vendedor: "João Silva",
      valor: "R$ 4.200",
      status: "concluída",
      data: "16/10/2025",
      natureza: "Locação",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1235",
      cliente: "Innovation Labs",
      vendedor: "Pedro Costa",
      valor: "R$ 19.850",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Demonstração",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1251",
      cliente: "Global Trade",
      vendedor: "Carlos Oliveira",
      valor: "R$ 7.300",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Revenda",
      segmento: "PME",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1252",
      cliente: "Smart Solutions",
      vendedor: "Maria Santos",
      valor: "R$ 3.950",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Serviço",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1234",
      cliente: "Startup Inovação",
      vendedor: "Ana Paula",
      valor: "R$ 8.900",
      status: "concluída",
      data: "14/10/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1253",
      cliente: "Global Systems",
      vendedor: "João Silva",
      valor: "R$ 11.200",
      status: "concluída",
      data: "14/10/2025",
      natureza: "Locação",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1254",
      cliente: "Future Tech",
      vendedor: "Pedro Costa",
      valor: "R$ 5.400",
      status: "concluída",
      data: "14/10/2025",
      natureza: "Revenda",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1220",
      cliente: "Empresa ABC",
      vendedor: "João Silva",
      valor: "R$ 12.500",
      status: "concluída",
      data: "13/10/2025",
      natureza: "Venda Direta",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1221",
      cliente: "Tech Solutions",
      vendedor: "Maria Santos",
      valor: "R$ 8.300",
      status: "concluída",
      data: "12/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1222",
      cliente: "Indústria XYZ",
      vendedor: "Carlos Oliveira",
      valor: "R$ 25.800",
      status: "concluída",
      data: "11/10/2025",
      natureza: "Revenda",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1223",
      cliente: "Comércio Beta",
      vendedor: "Ana Paula",
      valor: "R$ 5.600",
      status: "concluída",
      data: "10/10/2025",
      natureza: "Venda Direta",
      segmento: "PME",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1224",
      cliente: "Serviços Delta",
      vendedor: "Pedro Costa",
      valor: "R$ 15.200",
      status: "concluída",
      data: "09/10/2025",
      natureza: "Locação",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1225",
      cliente: "Grupo Omega Plus",
      vendedor: "João Silva",
      valor: "R$ 32.400",
      status: "concluída",
      data: "08/10/2025",
      natureza: "Venda Direta",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1226",
      cliente: "Digital Hub Pro",
      vendedor: "Maria Santos",
      valor: "R$ 18.900",
      status: "concluída",
      data: "07/10/2025",
      natureza: "Demonstração",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1210",
      cliente: "Innovation Co",
      vendedor: "Carlos Oliveira",
      valor: "R$ 22.300",
      status: "concluída",
      data: "06/10/2025",
      natureza: "Venda Direta",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1211",
      cliente: "Business Pro Ltda",
      vendedor: "Ana Paula",
      valor: "R$ 14.200",
      status: "concluída",
      data: "05/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1212",
      cliente: "Tech Ventures SA",
      vendedor: "Pedro Costa",
      valor: "R$ 16.800",
      status: "concluída",
      data: "04/10/2025",
      natureza: "Revenda",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1213",
      cliente: "Smart Solutions Inc",
      vendedor: "João Silva",
      valor: "R$ 28.500",
      status: "concluída",
      data: "03/10/2025",
      natureza: "Venda Direta",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1214",
      cliente: "Empresa ABC",
      vendedor: "Maria Santos",
      valor: "R$ 19.200",
      status: "concluída",
      data: "02/10/2025",
      natureza: "Locação",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1215",
      cliente: "Digital Masters Ltd",
      vendedor: "Carlos Oliveira",
      valor: "R$ 11.700",
      status: "concluída",
      data: "01/10/2025",
      natureza: "Demonstração",
      segmento: "Standard",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1216",
      cliente: "Future Systems Co",
      vendedor: "Ana Paula",
      valor: "R$ 9.800",
      status: "concluída",
      data: "30/09/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1200",
      cliente: "Enterprise Ltd",
      vendedor: "Pedro Costa",
      valor: "R$ 34.200",
      status: "concluída",
      data: "29/09/2025",
      natureza: "Serviço",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1201",
      cliente: "Corp Solutions Pro",
      vendedor: "João Silva",
      valor: "R$ 15.600",
      status: "concluída",
      data: "28/09/2025",
      natureza: "Revenda",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1202",
      cliente: "Tech Leaders Inc",
      vendedor: "Maria Santos",
      valor: "R$ 21.400",
      status: "concluída",
      data: "27/09/2025",
      natureza: "Venda Direta",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1203",
      cliente: "Innovation Hub SA",
      vendedor: "Carlos Oliveira",
      valor: "R$ 12.900",
      status: "concluída",
      data: "26/09/2025",
      natureza: "Locação",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1204",
      cliente: "Digital Pro Ltda",
      vendedor: "Ana Paula",
      valor: "R$ 18.700",
      status: "concluída",
      data: "25/09/2025",
      natureza: "Demonstração",
      segmento: "Standard",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1205",
      cliente: "Business Experts Co",
      vendedor: "Pedro Costa",
      valor: "R$ 26.300",
      status: "concluída",
      data: "24/09/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1206",
      cliente: "Smart Tech Labs",
      vendedor: "João Silva",
      valor: "R$ 14.500",
      status: "concluída",
      data: "23/09/2025",
      natureza: "Serviço",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
  ],
  "90": [
    {
      id: "#VD-1189",
      cliente: "Mega Corp S.A.",
      vendedor: "Maria Santos",
      valor: "R$ 45.800",
      status: "concluída",
      data: "10/10/2025",
      natureza: "Venda Direta",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1178",
      cliente: "Enterprise Global",
      vendedor: "João Silva",
      valor: "R$ 38.500",
      status: "concluída",
      data: "05/10/2025",
      natureza: "Revenda",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1167",
      cliente: "Tech Leaders Inc",
      vendedor: "Carlos Oliveira",
      valor: "R$ 52.300",
      status: "em_andamento",
      data: "28/09/2025",
      natureza: "Serviço",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1156",
      cliente: "Innovation Labs",
      vendedor: "Ana Paula",
      valor: "R$ 29.600",
      status: "concluída",
      data: "22/09/2025",
      natureza: "Locação",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1145",
      cliente: "Future Systems",
      vendedor: "Pedro Costa",
      valor: "R$ 41.200",
      status: "concluída",
      data: "15/09/2025",
      natureza: "Venda Direta",
      segmento: "PME",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1134",
      cliente: "Digital Masters",
      vendedor: "Maria Santos",
      valor: "R$ 36.800",
      status: "pendente",
      data: "08/09/2025",
      natureza: "Demonstração",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
  ],
  "current_month": [
    {
      id: "#VD-1251",
      cliente: "Inovação Tech",
      vendedor: "João Silva",
      valor: "R$ 18.900",
      status: "concluída",
      data: "19/10/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1250",
      cliente: "Soluções Digitais",
      vendedor: "Carlos Oliveira",
      valor: "R$ 22.400",
      status: "em_andamento",
      data: "18/10/2025",
      natureza: "Serviço",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1249",
      cliente: "Empresa Moderna",
      vendedor: "Maria Santos",
      valor: "R$ 14.200",
      status: "concluída",
      data: "17/10/2025",
      natureza: "Revenda",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1248",
      cliente: "Corp Digital",
      vendedor: "Ana Paula",
      valor: "R$ 9.800",
      status: "pendente",
      data: "16/10/2025",
      natureza: "Locação",
      segmento: "Standard",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1247",
      cliente: "Tech Solutions Pro",
      vendedor: "Pedro Costa",
      valor: "R$ 16.500",
      status: "concluída",
      data: "15/10/2025",
      natureza: "Venda Direta",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1246",
      cliente: "Business Experts",
      vendedor: "João Silva",
      valor: "R$ 28.300",
      status: "em_andamento",
      data: "14/10/2025",
      natureza: "Demonstração",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
  ],
  "365": [
    {
      id: "#VD-0987",
      cliente: "Conglomerado Alpha",
      vendedor: "João Silva",
      valor: "R$ 125.000",
      status: "concluída",
      data: "15/09/2025",
      natureza: "Venda Direta",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-0876",
      cliente: "Global Partners Ltd",
      vendedor: "Maria Santos",
      valor: "R$ 98.500",
      status: "concluída",
      data: "02/08/2025",
      natureza: "Revenda",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-0765",
      cliente: "Strategic Corp",
      vendedor: "Carlos Oliveira",
      valor: "R$ 87.300",
      status: "concluída",
      data: "18/07/2025",
      natureza: "Serviço",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-0654",
      cliente: "International Trade",
      vendedor: "Pedro Costa",
      valor: "R$ 76.800",
      status: "em_andamento",
      data: "05/06/2025",
      natureza: "Locação",
      segmento: "Corporativo",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-0543",
      cliente: "Premium Solutions",
      vendedor: "Ana Paula",
      valor: "R$ 65.400",
      status: "concluída",
      data: "22/05/2025",
      natureza: "Venda Direta",
      segmento: "PME",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-0432",
      cliente: "Elite Business",
      vendedor: "João Silva",
      valor: "R$ 112.600",
      status: "concluída",
      data: "10/04/2025",
      natureza: "Demonstração",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
  ],
  "custom": [
    {
      id: "#VD-1280",
      cliente: "Custom Solution Ltd",
      vendedor: "Maria Santos",
      valor: "R$ 34.800",
      status: "concluída",
      data: "12/10/2025",
      natureza: "Venda Direta",
      segmento: "Premium",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1279",
      cliente: "Range Business",
      vendedor: "João Silva",
      valor: "R$ 28.500",
      status: "em_andamento",
      data: "10/10/2025",
      natureza: "Revenda",
      segmento: "Standard",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1278",
      cliente: "Period Corp",
      vendedor: "Pedro Costa",
      valor: "R$ 19.200",
      status: "concluída",
      data: "08/10/2025",
      natureza: "Serviço",
      segmento: "PME",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1277",
      cliente: "Selected Dates Inc",
      vendedor: "Carlos Oliveira",
      valor: "R$ 42.600",
      status: "pendente",
      data: "05/10/2025",
      natureza: "Locação",
      segmento: "Corporativo",
      statusCliente: "Inativo"
    },
    {
      id: "#VD-1276",
      cliente: "Custom Range SA",
      vendedor: "Ana Paula",
      valor: "R$ 15.800",
      status: "concluída",
      data: "03/10/2025",
      natureza: "Venda Direta",
      segmento: "Startup",
      statusCliente: "Ativo"
    },
    {
      id: "#VD-1275",
      cliente: "Date Picker Enterprise",
      vendedor: "Maria Santos",
      valor: "R$ 51.900",
      status: "em_andamento",
      data: "01/10/2025",
      natureza: "Demonstração",
      segmento: "VIP",
      statusCliente: "Ativo"
    },
  ],
};

const statusConfig = {
  concluída: { label: "Concluída", variant: "default" as const },
  em_andamento: { label: "Em Andamento", variant: "secondary" as const },
  pendente: { label: "Pendente", variant: "outline" as const },
};

const periodDescriptions: Record<string, string> = {
  "7": "Transações dos últimos 7 dias",
  "30": "Transações dos últimos 30 dias",
  "current_month": "Transações do mês atual",
  "90": "Transações dos últimos 90 dias",
  "365": "Transações do último ano",
  "custom": "Transações do período selecionado",
};

interface RecentSalesTableProps {
  period: string;
  filters?: DashboardFilters;
  transactions: Transaction[]; // Receber transações já filtradas
}

export function RecentSalesTable({ period, filters, transactions }: RecentSalesTableProps) {
  const { usuario } = useAuth();
  const ehVendedor = usuario?.tipo === 'vendedor';
  
  // Converter transações para formato de vendas (já vem filtradas)
  const recentSales: Sale[] = useMemo(() => {
    return transactions.slice(0, 20).map(t => ({
      id: t.id,
      cliente: t.cliente,
      vendedor: t.vendedor,
      valor: `R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      status: 'concluída' as const,
      data: t.data,
      natureza: t.natureza,
      segmento: t.segmento,
      statusCliente: t.statusCliente,
      grupoRede: t.grupoRede,
    }));
  }, [transactions]);
  
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Vendas Recentes</CardTitle>
        <CardDescription>
          {period.includes('-') 
            ? `Transações do período selecionado` 
            : (periodDescriptions[period] || periodDescriptions["30"])}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentSales.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <p className="text-muted-foreground">Nenhuma venda encontrada com os filtros aplicados.</p>
              <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros para ver mais resultados.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Grupo/Rede</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{sale.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{sale.grupoRede || "-"}</TableCell>
                  <TableCell>{sale.vendedor}</TableCell>
                  <TableCell>{sale.valor}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[sale.status as keyof typeof statusConfig].variant}>
                      {statusConfig[sale.status as keyof typeof statusConfig].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{sale.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
