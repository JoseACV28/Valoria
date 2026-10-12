// Personal navigation belongs to the user menu; discovery stays in the sidebar.
export function userNavigationGroups(user) {
  return [
    { label: 'Mi espacio', items: [
      { id: 'profile', label: 'Mi perfil', icon: '◌', view: 'profile' },
      { id: 'library', label: 'Mi biblioteca', icon: '▤', view: 'library' },
      { id: 'offline', label: 'Sin conexión', icon: '↓', view: 'offline' },
      { id: 'wall', label: 'Muro', icon: '✦', view: 'profile', options: { profileTab: 'wall' } },
      { id: 'following', label: 'Siguiendo', icon: '↗', view: 'profile', options: { profileTab: 'following' } }
    ] },
    { label: 'Creación', items: [
      { id: 'creator', label: 'Panel de creador', icon: '✎', view: 'creator' },
      { id: 'collaborations', label: user?.isModerator ? 'Colaboraciones y moderación' : 'Colaboraciones', icon: '◇', view: 'collaborations' },
      { id: 'trash', label: 'Papelera', icon: '♲', view: 'trash' }
    ] },
    { label: 'Cuenta', items: [
      { id: 'account', label: 'Cuenta y privacidad', icon: '⚙', view: 'account' },
      { id: 'support', label: 'Centro de soporte', icon: '?', view: 'support' },
      { id: 'help', label: 'Ayuda', icon: 'ⓘ', view: 'help' },
      ...(user?.isAdmin ? [{ id: 'administration', label: 'Administración', icon: '⚙', view: 'administration' }] : [])
    ] }
  ];
}
