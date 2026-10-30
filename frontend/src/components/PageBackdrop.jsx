import { mediaUrl } from "../api.js";

// Full-page landscape photo behind a page, darkened so text stays readable.
// The page's root element needs the "has-backdrop" class.
export default function PageBackdrop({ image }) {
  return <div className="page-backdrop" style={{ backgroundImage: `url("${mediaUrl(image)}")` }} aria-hidden="true" />;
}
