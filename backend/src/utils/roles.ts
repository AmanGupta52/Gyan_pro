import type { UserRole } from '../types/index.js';

/**
 * Role model
 * ──────────
 *  player      Student. Plays competitions, solo quizzes and practice.
 *  teacher     Quiz creator. Creates questions + quizzes and sees results of OWN quizzes.
 *              Added only by a superAdmin.
 *  admin       Runs competitions, moderates the question bank and all quizzes.
 *  superAdmin  Everything admin can do, plus adds teachers and changes roles.
 */
export const ALL_ROLES: readonly UserRole[] = ['player', 'teacher', 'admin', 'superAdmin'];

/** Roles that can author questions and quizzes */
export const CONTENT_ROLES: readonly UserRole[] = ['teacher', 'admin', 'superAdmin'];

/** Roles with moderation power over content created by others */
export const MODERATOR_ROLES: readonly UserRole[] = ['admin', 'superAdmin'];

export function isContentCreator(role: UserRole): boolean {
  return CONTENT_ROLES.includes(role);
}

export function isModerator(role: UserRole): boolean {
  return MODERATOR_ROLES.includes(role);
}

/**
 * May this user edit/delete/see-results-of a piece of content?
 * Owners always can; admins and superAdmins can moderate anything.
 */
export function canManageContent(
  actor: { userId: string; role: UserRole },
  ownerId: string
): boolean {
  return isModerator(actor.role) || (isContentCreator(actor.role) && actor.userId === ownerId);
}
