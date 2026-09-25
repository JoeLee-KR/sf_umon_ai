import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/sfumonai';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}