import { useEffect, useState } from "react";
import * as api from "../api.js";
import { requireLogin, useSession } from "./session.js";

// The signed-in traveller's saved places, with a toggle that asks guests to sign in first.
export function useItinerary() {
  const { loggedIn } = useSession();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loggedIn) {
      setItems([]);
      return;
    }
    api.getItinerary().then(setItems).catch(setError);
  }, [loggedIn]);

  const itemFor = (placeId) => items.find((item) => item.place_id === placeId);

  const toggle = async (place) => {
    if (!loggedIn) {
      requireLogin(() => toggle(place));
      return;
    }
    setError(null);
    try {
      const existing = itemFor(place.id);
      if (existing) {
        await api.removeFromItinerary(existing.id);
        setItems((current) => current.filter((item) => item.id !== existing.id));
      } else {
        const item = await api.addToItinerary(place.id);
        setItems((current) => [...current, item]);
      }
    } catch (err) {
      setError(err);
    }
  };

  return { items, isSaved: (placeId) => Boolean(itemFor(placeId)), toggle, error };
}
