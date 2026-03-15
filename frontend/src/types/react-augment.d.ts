/**
 * React type augmentations.
 *
 * Note: Next.js references `react/experimental` which already includes
 * `inert?: boolean | undefined` on HTMLAttributes. No extra augmentation needed.
 *
 * Usage: <main inert={mobileOpen || undefined}>
 * When `true`, React serialises the attribute as `inert=""` in the DOM per HTML spec.
 */

export {};
