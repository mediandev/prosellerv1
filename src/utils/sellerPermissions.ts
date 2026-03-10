import type { UserPermissions } from "../types/seller";

export type SellerPermissionModule = keyof UserPermissions;
export type SellerPermissionAction = "visualizar" | "criar" | "editar" | "excluir";

const SELLER_PERMISSION_MODULES: SellerPermissionModule[] = [
  "dashboard",
  "vendas",
  "pipeline",
  "clientes",
  "metas",
  "comissoes",
  "produtos",
  "relatorios",
  "contacorrente",
  "equipe",
  "configuracoes",
];

const SELLER_PERMISSION_ACTIONS: SellerPermissionAction[] = [
  "visualizar",
  "criar",
  "editar",
  "excluir",
];

export const SELLER_SUPPORTED_PERMISSION_IDS = [
  "clientes.visualizar",
  "clientes.criar",
  "clientes.editar",
  "clientes.excluir",
  "vendas.visualizar",
  "vendas.criar",
  "vendas.editar",
  "vendas.excluir",
  "relatorios.visualizar",
  "contacorrente.visualizar",
  "contacorrente.criar",
  "contacorrente.editar",
  "contacorrente.excluir",
  "produtos.visualizar",
  "produtos.criar",
  "produtos.editar",
  "produtos.excluir",
  "comissoes.visualizar",
  "comissoes.lancamentos.editar",
  "comissoes.lancamentos.excluir",
] as const;

const SELLER_DEFAULT_PERMISSION_IDS: string[] = [
  "clientes.visualizar",
  "clientes.criar",
  "clientes.editar",
  "vendas.visualizar",
  "vendas.criar",
  "vendas.editar",
  "produtos.visualizar",
  "comissoes.visualizar",
  "relatorios.visualizar",
  "contacorrente.visualizar",
  "contacorrente.criar",
];

const PERMISSION_CELL_MAP: Record<
  SellerPermissionModule,
  Record<SellerPermissionAction, string | null>
> = {
  dashboard: {
    visualizar: null,
    criar: null,
    editar: null,
    excluir: null,
  },
  vendas: {
    visualizar: "vendas.visualizar",
    criar: "vendas.criar",
    editar: "vendas.editar",
    excluir: "vendas.excluir",
  },
  pipeline: {
    visualizar: null,
    criar: null,
    editar: null,
    excluir: null,
  },
  clientes: {
    visualizar: "clientes.visualizar",
    criar: "clientes.criar",
    editar: "clientes.editar",
    excluir: "clientes.excluir",
  },
  metas: {
    visualizar: null,
    criar: null,
    editar: null,
    excluir: null,
  },
  comissoes: {
    visualizar: "comissoes.visualizar",
    criar: null,
    editar: "comissoes.lancamentos.editar",
    excluir: "comissoes.lancamentos.excluir",
  },
  produtos: {
    visualizar: "produtos.visualizar",
    criar: "produtos.criar",
    editar: "produtos.editar",
    excluir: "produtos.excluir",
  },
  relatorios: {
    visualizar: "relatorios.visualizar",
    criar: null,
    editar: null,
    excluir: null,
  },
  contacorrente: {
    visualizar: "contacorrente.visualizar",
    criar: "contacorrente.criar",
    editar: "contacorrente.editar",
    excluir: "contacorrente.excluir",
  },
  equipe: {
    visualizar: null,
    criar: null,
    editar: null,
    excluir: null,
  },
  configuracoes: {
    visualizar: null,
    criar: null,
    editar: null,
    excluir: null,
  },
};

function createEmptyPermissionMatrix(): UserPermissions {
  const matrix = {} as UserPermissions;

  for (const moduleName of SELLER_PERMISSION_MODULES) {
    matrix[moduleName] = {
      visualizar: false,
      criar: false,
      editar: false,
      excluir: false,
    };
  }

  return matrix;
}

export function getSellerPermissionId(
  moduleName: SellerPermissionModule,
  action: SellerPermissionAction
): string | null {
  return PERMISSION_CELL_MAP[moduleName][action];
}

export function isSellerPermissionCellSupported(
  moduleName: SellerPermissionModule,
  action: SellerPermissionAction
): boolean {
  return getSellerPermissionId(moduleName, action) !== null;
}

export function getDefaultSellerPermissionIds(): string[] {
  return [...SELLER_DEFAULT_PERMISSION_IDS];
}

export function permissionIdsToSellerPermissionMatrix(
  permissionIds: unknown
): UserPermissions {
  const matrix = createEmptyPermissionMatrix();
  const ids = Array.isArray(permissionIds)
    ? permissionIds.filter((item): item is string => typeof item === "string")
    : getDefaultSellerPermissionIds();
  const idsSet = new Set(ids);

  for (const moduleName of SELLER_PERMISSION_MODULES) {
    for (const action of SELLER_PERMISSION_ACTIONS) {
      const permissionId = getSellerPermissionId(moduleName, action);
      matrix[moduleName][action] = permissionId ? idsSet.has(permissionId) : false;
    }
  }

  return matrix;
}

export function sellerPermissionMatrixToIds(
  matrix: Partial<UserPermissions> | null | undefined
): string[] {
  const ids: string[] = [];

  for (const moduleName of SELLER_PERMISSION_MODULES) {
    for (const action of SELLER_PERMISSION_ACTIONS) {
      const permissionId = getSellerPermissionId(moduleName, action);
      if (!permissionId) continue;

      if (matrix?.[moduleName]?.[action] === true) {
        ids.push(permissionId);
      }
    }
  }

  return Array.from(new Set(ids));
}

export function getDefaultSellerPermissionMatrix(): UserPermissions {
  return permissionIdsToSellerPermissionMatrix(getDefaultSellerPermissionIds());
}
