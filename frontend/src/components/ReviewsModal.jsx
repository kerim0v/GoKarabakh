import { useState } from "react";
import * as api from "../api.js";
import { useI18n } from "../i18n/index.jsx";
import { useSession } from "../lib/session.js";
import { useAsync } from "../lib/useAsync.js";
import Modal from "./Modal.jsx";
import Stars from "./Stars.jsx";

// Lists a place's reviews; `canReview` shows the form (used from the profile after a confirmed visit).
export default function ReviewsModal({ place, canReview = false, onClose, onChanged }) {
  const { t, errorText, formatDate } = useI18n();
  const { user } = useSession();
  const reviews = useAsync(() => api.getReviews(place.id), [place.id]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const list = reviews.data || [];
  const alreadyReviewed = list.some((r) => r.user_id === user?.id);
  const average = list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : 0;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createReview(place.id, rating, comment);
      setComment("");
      reviews.reload();
      onChanged?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteReview(id);
      reviews.reload();
      onChanged?.();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="reviews-title" wide>
      <span className="eyebrow mono auth-eyebrow">{t("reviews.eyebrow")} •</span>
      <h2 id="reviews-title" className="auth-title-enhanced">{place.name}</h2>
      <p className="auth-subtitle-enhanced"><Stars rating={average} count={list.length} /></p>

      {canReview && !alreadyReviewed && (
        <form className="auth-form-enhanced review-form" onSubmit={submit}>
          <div className="rating-picker" role="radiogroup" aria-label={t("reviews.yourRating")}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value}`}
                className={value <= rating ? "is-on" : ""}
                onClick={() => setRating(value)}
              >
                ★
              </button>
            ))}
          </div>
          <textarea rows="3" maxLength="2000" placeholder={t("reviews.commentPlaceholder")} value={comment} onChange={(event) => setComment(event.target.value)} />
          {error && <p role="alert" className="form-error">{error}</p>}
          <button className="button-auth-submit" type="submit" disabled={submitting}>
            <span>{submitting ? t("common.wait") : t("reviews.submit")}</span>
          </button>
        </form>
      )}

      <div className="review-list">
        {reviews.loading && <p className="muted">{t("common.loading")}</p>}
        {!reviews.loading && !list.length && <p className="muted">{t("reviews.empty")}</p>}
        {list.map((review) => (
          <article className="review" key={review.id}>
            <div className="review-head">
              <strong>{review.author_name}</strong>
              <span className="review-stars" aria-label={`${review.rating}/5`}>{"★".repeat(review.rating)}</span>
              <small>{formatDate(review.creation_date)}</small>
            </div>
            {review.comment && <p>{review.comment}</p>}
            {(review.user_id === user?.id || user?.role === "admin") && (
              <button type="button" className="link-button danger" onClick={() => remove(review.id)}>{t("common.remove")}</button>
            )}
          </article>
        ))}
      </div>
    </Modal>
  );
}
