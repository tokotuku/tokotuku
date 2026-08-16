export interface CartItem {
  id: number;
  name: string;
  priceCents: number;
  imageUrl: string;
  quantity: number;
}

const CART_KEY = "takontuku-cart";
const CART_CHANGED_EVENT = "takontuku:cart-changed";

export function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function cartCount(cart: CartItem[] = readCart()): number {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

export function addToCart(product: Omit<CartItem, "quantity">): CartItem[] {
  const cart = readCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  writeCart(cart);
  return cart;
}

export function removeFromCart(id: number): CartItem[] {
  const cart = readCart().filter((item) => item.id !== id);
  writeCart(cart);
  return cart;
}

export function setQuantity(id: number, quantity: number): CartItem[] {
  const cart = readCart();
  const item = cart.find((entry) => entry.id === id);
  if (item) item.quantity = quantity;
  writeCart(cart);
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

/** Fires immediately (so callers don't miss the initial state) and on every subsequent mutation. */
export function onCartChange(listener: () => void): void {
  window.addEventListener(CART_CHANGED_EVENT, listener);
  listener();
}
