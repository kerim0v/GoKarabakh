import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);

  const refreshCart = async () => {
    const response = await fetch("/api/v1/cart");
    if (!response.ok) throw new Error("Unable to load your cart");
    const result = await response.json();
    setItems(result.items || []);
  };

  useEffect(() => {
    refreshCart().catch(() => setItems([])).finally(() => setCartLoading(false));
  }, []);

  const addToCart = async (item) => {
    const response = await fetch("/api/v1/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to add item");
    setItems(result.items || []);
  };

  const removeFromCart = async (itemId) => {
    const response = await fetch(`/api/v1/cart/${encodeURIComponent(itemId)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to remove item");
    setItems(result.items || []);
  };

  const checkout = async (itemId, cardLast4) => {
    const response = await fetch("/api/v1/cart/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({ item_id: itemId, card_last4: cardLast4 }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Payment failed");
    setItems(result.items || []);
    return result;
  };

  return (
    <CartContext.Provider value={{ items, itemCount: items.length, cartLoading, addToCart, removeFromCart, checkout }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
