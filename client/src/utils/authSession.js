// API email/password login must populate the SDK too, for refresh and sign-out.
export async function syncApiSession(client, auth) {
  if (!client || !auth?.refreshToken) return;
  const { error } = await client.auth.setSession({
    access_token: auth.accessToken,
    refresh_token: auth.refreshToken
  });
  if (error) throw new Error('No se pudo preparar la sesión. Reintenta el acceso.');
}

export async function closeAuthSession(client, token, revokeApi) {
  try {
    await revokeApi(token);
    const result = await client?.auth.signOut({ scope: 'local' });
    if (result?.error) throw result.error;
  } catch {
    throw new Error('No se pudo confirmar el cierre de sesión. Comprueba la conexión y reintenta.');
  }
}
