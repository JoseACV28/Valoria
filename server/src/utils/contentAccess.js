// Los borradores solo son visibles para su autor, incluso con un enlace directo.
export function canReadContent(content, user) {
  return Boolean(content && !content.deleted_at && (
    (content.status === "published" && !content.moderation_hidden_at && content.visibility !== "private") ||
    (user?.id && content.authorId === user.id)
  ));
}

export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
