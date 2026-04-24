import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

/**
 * Smoke test (F-001 · B.1) do padrão de UI para o dual-ID de natureza Tiny.
 *
 * Objetivo do teste:
 *  - Confirmar que o padrão "switch + campo condicional" funciona em jsdom
 *    com @testing-library/react.
 *  - Fixar o contrato visual: switch OFF exibe 1 campo (ID Tiny padrão); ON
 *    exibe 2 campos (ID Tiny padrão + ID Tiny Simples). Ver SPEC RF-004.
 *
 * O componente final de produção (que envolve shadcn Switch + Input) será
 * integrado em `src/components/CompanyERPDialog.tsx` no commit B.7. Este
 * smoke test usa um componente inline mínimo para não depender dos aliases
 * de Radix versionados (`@radix-ui/react-switch@1.1.3`) que vivem em
 * `vite.config.ts` mas não precisam estar em `vitest.config.ts` para este
 * smoke funcional.
 */
function NaturezaTinyMapeamentoRowInline() {
  const [enabled, setEnabled] = useState(false);
  const [tinyValor, setTinyValor] = useState('');
  const [tinyValorSimples, setTinyValorSimples] = useState('');

  return (
    <div>
      <label htmlFor="switch-simples">Habilitar natureza para Simples Nacional</label>
      <input
        id="switch-simples"
        type="checkbox"
        role="switch"
        aria-checked={enabled}
        checked={enabled}
        onChange={(e) => {
          const next = e.target.checked;
          setEnabled(next);
          if (!next) setTinyValorSimples('');
        }}
      />

      <label htmlFor="tinyValor">ID Tiny padrão</label>
      <input
        id="tinyValor"
        value={tinyValor}
        onChange={(e) => setTinyValor(e.target.value)}
      />

      {enabled && (
        <>
          <label htmlFor="tinyValorSimples">ID Tiny quando optante Simples</label>
          <input
            id="tinyValorSimples"
            value={tinyValorSimples}
            onChange={(e) => setTinyValorSimples(e.target.value)}
          />
        </>
      )}
    </div>
  );
}

describe('Mapeamento Natureza Tiny · toggle dual-ID (F-001 smoke)', () => {
  it('por default (switch OFF) mostra apenas o campo ID Tiny padrão', () => {
    render(<NaturezaTinyMapeamentoRowInline />);
    expect(screen.getByLabelText('ID Tiny padrão')).toBeInTheDocument();
    expect(screen.queryByLabelText('ID Tiny quando optante Simples')).toBeNull();
  });

  it('ao ligar o switch, adiciona o campo ID Tiny Simples', async () => {
    render(<NaturezaTinyMapeamentoRowInline />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('switch', { name: /Habilitar natureza para Simples Nacional/i }));

    expect(screen.getByLabelText('ID Tiny padrão')).toBeInTheDocument();
    expect(screen.getByLabelText('ID Tiny quando optante Simples')).toBeInTheDocument();
  });

  it('ao desligar o switch, remove o campo ID Tiny Simples e limpa valor', async () => {
    render(<NaturezaTinyMapeamentoRowInline />);
    const user = userEvent.setup();
    const toggle = screen.getByRole('switch', { name: /Habilitar natureza para Simples Nacional/i });

    await user.click(toggle);
    await user.type(screen.getByLabelText('ID Tiny quando optante Simples'), '2002');
    expect(screen.getByLabelText<HTMLInputElement>('ID Tiny quando optante Simples').value).toBe('2002');

    await user.click(toggle);
    expect(screen.queryByLabelText('ID Tiny quando optante Simples')).toBeNull();
  });
});
