/** Mensaje en español para un error de Firebase (vacío si no hay que mostrar nada, como al cerrar la ventana de Google). */
export function mensajeDeError(error: unknown): string {
  const codigo = (error as { code?: string })?.code ?? '';
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'El correo o la contraseña no coinciden.';
    case 'auth/email-already-in-use':
      return 'Ya hay una cuenta con ese correo. Entra con tu contraseña o con Google.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'La contraseña debe tener al menos 8 caracteres.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'Ese correo no parece válido.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return '';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.';
    case 'auth/operation-not-allowed':
      return 'Esta forma de entrar no está activada todavía. Prueba con otra.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos seguidos. Espera unos minutos e inténtalo otra vez.';
    case 'auth/network-request-failed':
    case 'unavailable':
      return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
    case 'auth/requires-recent-login':
      return 'Por seguridad, vuelve a entrar a tu cuenta y repite lo que estabas haciendo.';
    case 'permission-denied':
    case 'storage/unauthorized':
      return 'No tienes permiso para hacer esto (o los datos no cumplen las reglas).';
    case 'storage/unknown':
    case 'storage/bucket-not-found':
    case 'storage/project-not-found':
      return 'No se pudo subir la imagen: revisa que Storage esté activado en Firebase.';
    default:
      // El código real queda en la consola: sin él, "Algo salió mal" no dice qué falló.
      console.warn('Error de Firebase sin mensaje propio:', codigo || error);
      return 'Algo salió mal. Inténtalo otra vez.';
  }
}
