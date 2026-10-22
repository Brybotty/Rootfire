import { decodificar, decodificarCampos } from './rest';

describe('lectura REST de Firestore', () => {
  it('pasa cada tipo de valor a un valor normal', () => {
    expect(decodificar({ stringValue: 'Ron & Bacon' })).toBe('Ron & Bacon');
    expect(decodificar({ integerValue: '25000' })).toBe(25000);
    expect(decodificar({ doubleValue: 0.5 })).toBe(0.5);
    expect(decodificar({ booleanValue: false })).toBe(false);
    expect(decodificar({ nullValue: null })).toBeNull();
    expect(decodificar({ timestampValue: '2026-10-22T18:00:00Z' })).toBe('2026-10-22T18:00:00Z');
  });

  it('recorre listas y mapas anidados (una lista vacía llega sin "values")', () => {
    const campos = decodificarCampos({
      menu: {
        mapValue: {
          fields: {
            platos: { arrayValue: { values: [{ mapValue: { fields: { id: { stringValue: 'la-clasica' }, precio: { integerValue: '19000' } } } }] } },
            categorias: { arrayValue: {} },
          },
        },
      },
    });
    expect(campos).toEqual({ menu: { platos: [{ id: 'la-clasica', precio: 19000 }], categorias: [] } });
  });
});
