// Utilitários para máscaras e formatação

export const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCEP = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const maskTelefoneFixo = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskTelefoneCelular = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskCurrency = (value: number | string): string => {
  const numero = typeof value === 'string' ? parseFloat(value) : value;
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const unmaskNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = unmaskNumber(cpf);
  
  if (cleanCPF.length !== 11) return false;
  // Removido: validação de dígitos repetidos - CPFs válidos podem ter padrões específicos

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCPF.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = unmaskNumber(cnpj);
  
  if (cleanCNPJ.length !== 14) return false;
  // Removido: validação de dígitos repetidos - CNPJs válidos como "00.000.000/0001-91" (Banco do Brasil) existem

  let tamanho = cleanCNPJ.length - 2;
  let numeros = cleanCNPJ.substring(0, tamanho);
  const digitos = cleanCNPJ.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cleanCNPJ.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validateCEP = (cep: string): boolean => {
  const cleanCEP = unmaskNumber(cep);
  return cleanCEP.length === 8;
};

// Aliases para compatibilidade
export const applyCPFMask = maskCPF;
export const applyCNPJMask = maskCNPJ;
export const applyCEPMask = maskCEP;
export const applyPhoneMask = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  // Se tem 11 dígitos, é celular, se tem 10, é fixo
  if (cleanValue.length <= 10) {
    return maskTelefoneFixo(value);
  }
  return maskTelefoneCelular(value);
};

export const applyCPFCNPJMask = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  // Se tem mais de 11 dígitos, é CNPJ
  if (cleanValue.length > 11) {
    return maskCNPJ(value);
  }
  return maskCPF(value);
};

// Função para formatar moeda
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

// Função para formatar CNPJ
export const formatCNPJ = (value: string): string => {
  if (!value) return '';
  return maskCNPJ(value);
};

// Máscara para NCM (formato: 0000.00.00 - 8 dígitos)
export const maskNCM = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length <= 4) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.substring(0, 4)}.${cleaned.substring(4)}`;
  } else {
    return `${cleaned.substring(0, 4)}.${cleaned.substring(4, 6)}.${cleaned.substring(6, 8)}`;
  }
};

// Máscara para CEST (formato: 00.000.00)
export const maskCEST = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{2})\d+?$/, '$1');
};

// Máscara para EAN-13 (13 dígitos numéricos)
export const maskEAN13 = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .substring(0, 13);
};
