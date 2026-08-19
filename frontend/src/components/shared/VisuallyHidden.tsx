import { VisuallyHidden as RadixVisuallyHidden } from "radix-ui";

/** Keeps an accessible name/description in the DOM for screen readers
 * without rendering it visually — used for dialog/sheet titles whose
 * layout doesn't need a visible heading. */
export const VisuallyHidden = RadixVisuallyHidden.Root;
