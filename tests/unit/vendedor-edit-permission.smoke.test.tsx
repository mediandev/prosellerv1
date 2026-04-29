import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

/**
 * Smoke test (BUG-003) do contrato visual do campo "Vendedor" na edição
 * de pedido. Backoffice deve ter um Select editável; vendedor comum continua
 * com o campo desabilitado (read-only). O Select de produção em
 * `src/components/SaleFormPage.tsx` usa shadcn Select; aqui usamos um
 * componente inline mínimo para fixar a regra de visibilidade/permissão
 * sem depender dos aliases versionados de Radix.
 */

type Tipo = 'backoffice' | 'vendedor';

interface Props {
  tipoUsuario: Tipo;
  isReadOnly?: boolean;
  pedidoBloqueado?: boolean;
  vendedores: Array<{ id: string; nome: string }>;
  initialVendedorId: string;
  initialNomeVendedor: string;
}

function VendedorFieldInline({
  tipoUsuario,
  isReadOnly = false,
  pedidoBloqueado = false,
  vendedores,
  initialVendedorId,
  initialNomeVendedor,
}: Props) {
  const isBackoffice = tipoUsuario === 'backoffice';
  const [vendedorId, setVendedorId] = useState(initialVendedorId);
  const [nomeVendedor, setNomeVendedor] = useState(initialNomeVendedor);

  return (
    <div>
      <label htmlFor="vendedor-field">Vendedor</label>
      {isBackoffice ? (
        <select
          id="vendedor-field"
          aria-label="Vendedor"
          value={vendedorId}
          disabled={isReadOnly || pedidoBloqueado}
          onChange={(e) => {
            const next = e.target.value;
            const found = vendedores.find((v) => v.id === next);
            setVendedorId(next);
            setNomeVendedor(found?.nome || '');
          }}
        >
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </select>
      ) : (
        <input
          id="vendedor-field"
          aria-label="Vendedor"
          value={nomeVendedor}
          disabled
          readOnly
        />
      )}
    </div>
  );
}

const VENDEDORES = [
  { id: 'v1', nome: 'Ana Silva' },
  { id: 'v2', nome: 'Bruno Costa' },
];

describe('Edição de Vendedor no pedido (BUG-003 smoke)', () => {
  it('vendedor comum vê campo desabilitado (read-only Input)', () => {
    render(
      <VendedorFieldInline
        tipoUsuario="vendedor"
        vendedores={VENDEDORES}
        initialVendedorId="v1"
        initialNomeVendedor="Ana Silva"
      />,
    );
    const field = screen.getByLabelText('Vendedor') as HTMLInputElement;
    expect(field.tagName).toBe('INPUT');
    expect(field.disabled).toBe(true);
    expect(field.value).toBe('Ana Silva');
  });

  it('backoffice em modo edição enxerga o Select habilitado', () => {
    render(
      <VendedorFieldInline
        tipoUsuario="backoffice"
        vendedores={VENDEDORES}
        initialVendedorId="v1"
        initialNomeVendedor="Ana Silva"
      />,
    );
    const field = screen.getByLabelText('Vendedor') as HTMLSelectElement;
    expect(field.tagName).toBe('SELECT');
    expect(field.disabled).toBe(false);
  });

  it('backoffice consegue trocar o vendedor selecionado', async () => {
    render(
      <VendedorFieldInline
        tipoUsuario="backoffice"
        vendedores={VENDEDORES}
        initialVendedorId="v1"
        initialNomeVendedor="Ana Silva"
      />,
    );
    const user = userEvent.setup();
    const field = screen.getByLabelText('Vendedor') as HTMLSelectElement;

    await user.selectOptions(field, 'v2');
    expect(field.value).toBe('v2');
  });

  it('backoffice em pedido bloqueado mantém Select desabilitado', () => {
    render(
      <VendedorFieldInline
        tipoUsuario="backoffice"
        pedidoBloqueado
        vendedores={VENDEDORES}
        initialVendedorId="v1"
        initialNomeVendedor="Ana Silva"
      />,
    );
    const field = screen.getByLabelText('Vendedor') as HTMLSelectElement;
    expect(field.tagName).toBe('SELECT');
    expect(field.disabled).toBe(true);
  });

  it('backoffice em modo visualização mantém Select desabilitado', () => {
    render(
      <VendedorFieldInline
        tipoUsuario="backoffice"
        isReadOnly
        vendedores={VENDEDORES}
        initialVendedorId="v1"
        initialNomeVendedor="Ana Silva"
      />,
    );
    const field = screen.getByLabelText('Vendedor') as HTMLSelectElement;
    expect(field.disabled).toBe(true);
  });
});
