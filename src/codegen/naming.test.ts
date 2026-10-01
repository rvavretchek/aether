import { describe, it, expect } from 'vitest';
import {
  slugToPascalCase,
  slugToCamelCase,
  slugToTableName,
} from './naming.js';

describe('slugToPascalCase', () => {
  it('capitaliza um slug de uma palavra', () => {
    expect(slugToPascalCase('pedidos')).toBe('Pedidos');
  });

  it('capitaliza cada segmento de um slug com hífen', () => {
    expect(slugToPascalCase('fila-pedidos')).toBe('FilaPedidos');
  });
});

describe('slugToCamelCase', () => {
  it('primeira letra minúscula, resto igual ao PascalCase', () => {
    expect(slugToCamelCase('pedidos')).toBe('pedidos');
    expect(slugToCamelCase('fila-pedidos')).toBe('filaPedidos');
  });
});

describe('slugToTableName', () => {
  it('troca hífen por underscore, sem pluralizar', () => {
    expect(slugToTableName('pedidos')).toBe('pedidos');
    expect(slugToTableName('fila-pedidos')).toBe('fila_pedidos');
  });
});
