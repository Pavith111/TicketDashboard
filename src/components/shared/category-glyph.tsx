import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { categoryIcon } from "@/lib/category-icons";

/** Renders the Lucide icon configured for an issue category. */
export function CategoryGlyph({ name, ...props }: LucideProps & { name?: string | null }) {
  return createElement(categoryIcon(name), props);
}
