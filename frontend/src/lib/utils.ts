import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function partPrice(p: { price: number; discountPrice?: number }): number {
  return p.discountPrice && p.discountPrice > 0 ? p.discountPrice : p.price;
}
