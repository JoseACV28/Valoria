// Bound authentication requests so a dropped mobile connection cannot leave the form busy.
export async function authRequest(url, options = {}, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(payload.message || 'Ocurrio un error de autenticacion'), { status: response.status, code: payload.code });
    return payload;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('El servidor no respondió a tiempo. Comprueba la conexión y vuelve a intentarlo.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con el servidor. Comprueba la conexión y vuelve a intentarlo.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
