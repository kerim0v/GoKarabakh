import { useEffect, useState } from "react";

const starterMemories = [
  { image: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1100&q=85", place: "Tartar", date: "06 June 2025", author: "@aysel.travels", note: "Morning mist slowly woke the mountains.", tape: "tape-rose" },
  { image: "https://images.unsplash.com/photo-1533130061792-64b345e4a833?auto=format&fit=crop&w=900&q=85", place: "Shusha", date: "18 May 2025", author: "@nadirnorth", note: "Every step on these stone streets carries its own story.", tape: "tape-gold" },
  { image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85", place: "Lachin", date: "02 April 2025", author: "@leyla.frames", note: "The road never ended; it simply turned greener.", tape: "tape-sage" },
  { image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=85", place: "Kalbajar", date: "21 March 2025", author: "@safar.notes", note: "Sunlight fell into the valley like a handwritten letter.", tape: "tape-blue" },
];

function ShareModal({ onClose, onShare }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (!file) return;
    onShare({ image: URL.createObjectURL(file), place: "New memory", date: new Intl.DateTimeFormat("en", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()), author: "You", note: note.trim() || "A small memory from Karabakh.", tape: "tape-rose" });
  };
  return <div className="memory-book-modal-backdrop" onMouseDown={onClose}><section className="memory-book-share-modal" role="dialog" aria-modal="true" aria-labelledby="memory-book-modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="memory-book-modal-close" type="button" onClick={onClose} aria-label="Close">x</button><span className="memory-book-label">New entry</span><h2>Pin a memory</h2><p>Choose a photograph or take one, then add a short note to your journal.</p><form onSubmit={submit}><div className="memory-book-upload-actions"><label htmlFor="memory-book-upload">Upload photo</label><label htmlFor="memory-book-camera">Take photo</label></div><input id="memory-book-upload" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /><input id="memory-book-camera" type="file" accept="image/*" capture="environment" onChange={(event) => setFile(event.target.files?.[0] || null)} /><span className="memory-book-file-name">{file ? file.name : "No photo selected"}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write your memory..." rows="4" /><button className="memory-book-save" type="submit" disabled={!file}>Add to journal</button></form></section></div>;
}

export default function MemoryBook({ embedded = false }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("isLoggedIn") === "true");
  const [memories, setMemories] = useState(starterMemories);
  const [page, setPage] = useState(0);
  const [turning, setTurning] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const memory = memories[page];

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    window.addEventListener("auth:changed", syncAuth);
    return () => window.removeEventListener("auth:changed", syncAuth);
  }, []);

  const turn = (direction) => {
    const next = page + direction;
    if (next < 0 || next >= memories.length || turning) return;
    setTurning(direction > 0 ? "is-turning-forward" : "is-turning-back");
    window.setTimeout(() => { setPage(next); setTurning(""); }, 420);
  };
  const addMemory = (newMemory) => { setMemories((items) => [...items, newMemory]); setPage(memories.length); setShareOpen(false); };

  return <div className={`memory-book-page${embedded ? " memory-book-embedded" : ""}`}><header className="memory-book-header"><a className="memory-book-brand" href="/">GOKARABAKH</a><span className="memory-book-label">Inter Karabakh / Memory Book</span><img className="memory-book-bulbul" src="/lacin/khari-bulbul1.png" alt="Khari Bulbul" /></header><main className="memory-book-main"><div className="memory-book-intro"><span className="memory-book-label">Journal entry {String(page + 1).padStart(2, "0")}</span><h1>Karabakh<br /><em>memory book.</em></h1></div><section className="memory-book" aria-label="Karabakh memory book"><div className={`memory-book-spread ${turning}`}><div className="memory-book-spine" aria-hidden="true" /><article className="memory-book-sheet memory-book-photo-page"><span className="memory-book-page-count">{page * 2 + 1}</span><div className={`memory-book-photo ${memory.tape}`}><span className="memory-book-photo-corner corner-one" /><span className="memory-book-photo-corner corner-two" /><span className="memory-book-photo-corner corner-three" /><span className="memory-book-photo-corner corner-four" /><img src={memory.image} alt={memory.note} /></div></article><article className="memory-book-sheet memory-book-note-page"><span className="memory-book-page-count">{page * 2 + 2}</span><div className="memory-book-stamp">{memory.place} <span>{memory.date}</span></div><div className="memory-book-entry"><p>{memory.note}</p></div><div className="memory-book-author"><span className="memory-book-author-mark">K</span><span>Shared by <strong>{memory.author}</strong></span></div></article></div><div className="memory-book-controls"><button type="button" onClick={() => turn(-1)} disabled={page === 0}>Previous page</button><span>{page + 1} / {memories.length}</span><button type="button" onClick={() => turn(1)} disabled={page === memories.length - 1}>Next page</button></div></section>{isLoggedIn && <button className="memory-book-share-button" type="button" onClick={() => setShareOpen(true)}>Pin a memory</button>}</main>{shareOpen && <ShareModal onClose={() => setShareOpen(false)} onShare={addMemory} />}</div>;
}
