import { mediaUrl } from "../api.js";

// Full-page background behind a page: the site's green gradient (tone "dark" or "light"),
// or a darkened photo when `image` is given.
// The page's root element needs the "has-backdrop" class.
export default function PageBackdrop({ image, tone = "dark" }) {
  if (!image) return <div className={`page-backdrop${tone === "light" ? " is-light" : ""}`} aria-hidden="true" />;
  return <div className="page-backdrop has-photo" style={{ backgroundImage: `url("${mediaUrl(image)}")` }} aria-hidden="true" />;
}
