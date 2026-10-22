// Permite que Node importe los .ts de la app aunque sus imports no lleven extensión ('./modelo').
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (error) {
    const relativo = /^\.\.?\//.test(especificador);
    const sinExtension = !/\.[cm]?[jt]s$/.test(especificador);
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && relativo && sinExtension) {
      return siguiente(`${especificador}.ts`, contexto);
    }
    throw error;
  }
}
