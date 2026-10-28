"""Rule-based trip planner used when no AI is available: free, offline and predictable.

It reads regions and interests from the traveller's wishes (in Azerbaijani, English or Russian),
then fills each day with sights, meals and a place to stay from the listings.
"""
import datetime

REGION_NAMES = {
    "shusha": {"en": "Shusha", "az": "Şuşa", "ru": "Шуша", "match": ["shusha", "şuşa", "susa", "шуш"]},
    "kalbajar": {"en": "Kalbajar", "az": "Kəlbəcər", "ru": "Кяльбаджар", "match": ["kalbajar", "kəlbəcər", "kelbecer", "кяльбаджар", "кельбаджар"]},
    "lachin": {"en": "Lachin", "az": "Laçın", "ru": "Лачин", "match": ["lachin", "laçın", "lacin", "лачин"]},
    "khankendi": {"en": "Khankendi", "az": "Xankəndi", "ru": "Ханкенди", "match": ["khankendi", "xankəndi", "xankendi", "ханкенди"]},
    "aghdam": {"en": "Aghdam", "az": "Ağdam", "ru": "Агдам", "match": ["aghdam", "ağdam", "agdam", "агдам"]},
    "khojaly": {"en": "Khojaly", "az": "Xocalı", "ru": "Ходжалы", "match": ["khojaly", "xocalı", "xocali", "ходжалы"]},
    "khojavend": {"en": "Khojavend", "az": "Xocavənd", "ru": "Ходжавенд", "match": ["khojavend", "xocavənd", "xocavend", "ходжавенд"]},
    "qubadli": {"en": "Qubadli", "az": "Qubadlı", "ru": "Губадлы", "match": ["qubadli", "qubadlı", "gubadli", "губадлы"]},
    "zangilan": {"en": "Zangilan", "az": "Zəngilan", "ru": "Зангилан", "match": ["zangilan", "zəngilan", "zengilan", "зангилан"]},
}

# Word stems that point at an interest, in all three languages
INTERESTS = {
    "history": ["histor", "architect", "fortress", "castle", "museum", "heritage", "culture", "tarix", "qala", "memar",
                "muzey", "mədəniyyət", "истор", "крепост", "архитект", "музе", "культур"],
    "nature": ["nature", "hik", "walk", "trek", "mountain", "forest", "river", "view", "sunset", "təbiət", "dağ", "meşə",
               "gəzinti", "yürüş", "çay", "mənzərə", "природ", "поход", "прогул", "гор", "лес", "рек", "вид", "закат"],
    "food": ["food", "cuisine", "eat", "restaurant", "dinner", "lunch", "tea", "mətbəx", "yemək", "restoran", "çay evi",
             "кухн", "еда", "ресторан", "ужин", "обед", "чай"],
    "relax": ["relax", "spa", "spring", "calm", "quiet", "istirahət", "bulaq", "sakit", "istisu", "отдых", "источник",
              "спокой", "тих"],
}

TEXT = {
    "en": {
        "summary": "A {days}-day trip through {regions}, put together from GoKarabakh's listings{focus}.",
        "focus": " with a focus on {interests}",
        "interests": {"history": "history", "nature": "nature", "food": "local food", "relax": "rest"},
        "day": "{region}: day {n}",
        "reasons": {
            "morning": "A good first stop while the light is soft and it's still quiet.",
            "afternoon": "Fits the afternoon and keeps the day at an easy pace.",
            "lunch": "A lunch break with local dishes close to the day's route.",
            "dinner": "Dinner nearby to end the day.",
            "hotel": "A place to stay in {region} for the night.",
            "match": "Matches what you asked for: {interest}.",
        },
        "tips": [
            "This plan was made by GoKarabakh's simple trip builder, not by AI. Check opening times when you book.",
            "Distances between regions can take a few hours by car - plan travel time between days.",
        ],
    },
    "az": {
        "summary": "{regions} üzrə {days} günlük səfər, GoKarabakh elanlarından tərtib olunub{focus}.",
        "focus": ", əsas diqqət: {interests}",
        "interests": {"history": "tarix", "nature": "təbiət", "food": "yerli mətbəx", "relax": "istirahət"},
        "day": "{region}: {n}-ci gün",
        "reasons": {
            "morning": "İşıq yumşaq və hələ sakit olanda yaxşı ilk dayanacaq.",
            "afternoon": "Günortadan sonraya uyğundur və günü rahat tempdə saxlayır.",
            "lunch": "Marşruta yaxın, yerli yeməklərlə nahar fasiləsi.",
            "dinner": "Günü bitirmək üçün yaxınlıqda şam yeməyi.",
            "hotel": "{region} ərazisində gecələmək üçün yer.",
            "match": "İstəyinizə uyğundur: {interest}.",
        },
        "tips": [
            "Bu plan süni intellekt yox, GoKarabakh-ın sadə səfər qurucusu tərəfindən hazırlanıb. Rezerv edərkən iş saatlarını yoxlayın.",
            "Rayonlar arası yol maşınla bir neçə saat çəkə bilər - günlər arasında yol vaxtı nəzərə alın.",
        ],
    },
    "ru": {
        "summary": "Поездка на {days} дн. по местам: {regions}, собранная из объявлений GoKarabakh{focus}.",
        "focus": ", акцент: {interests}",
        "interests": {"history": "история", "nature": "природа", "food": "местная кухня", "relax": "отдых"},
        "day": "{region}: день {n}",
        "reasons": {
            "morning": "Хорошее начало дня, пока свет мягкий и ещё тихо.",
            "afternoon": "Подходит для второй половины дня и не перегружает маршрут.",
            "lunch": "Обед с местной кухней рядом с маршрутом.",
            "dinner": "Ужин неподалёку, чтобы завершить день.",
            "hotel": "Ночлег в районе {region}.",
            "match": "Соответствует вашему запросу: {interest}.",
        },
        "tips": [
            "Этот план составил простой конструктор поездок GoKarabakh, а не AI. Проверяйте часы работы при бронировании.",
            "Дорога между районами может занять несколько часов на машине - заложите время на переезды.",
        ],
    },
}


def _find(text, stems):
    return any(stem in text for stem in stems)


def read_wishes(wishes):
    text = (wishes or "").lower()
    regions = [slug for slug, names in REGION_NAMES.items() if _find(text, names["match"])]
    interests = [name for name, stems in INTERESTS.items() if _find(text, stems)]
    return regions, interests


def _place_text(place):
    return " ".join(filter(None, [place.name, place.subtitle, place.description, place.badge])).lower()


def _score(row, interests, budget):
    place, _owner, bookings, avg_rating, _count = row
    score = float(avg_rating or 3.5) + min(bookings, 10) * 0.1
    text = _place_text(place)
    score += sum(1.5 for interest in interests if _find(text, INTERESTS[interest]))
    if budget == "economy":
        score -= float(place.cost) / 100
    elif budget == "premium":
        score += float(place.cost) / 100
    return score


def plan_demo(rows, wishes, start_date, days, guests, budget, language):
    """Same shape as the AI plan: {"summary", "days": [{date, title, stops: [{place_id, time, reason}]}], "tips"}."""
    text = TEXT[language]
    wanted_regions, interests = read_wishes(wishes)
    by_region = {}
    for row in rows:
        by_region.setdefault(row[0].region, []).append(row)

    if not wanted_regions:
        # Best-matching regions first, so a 1-2 day trip stays in one place
        ranked = sorted(by_region, key=lambda slug: -sum(_score(r, interests, budget) for r in by_region[slug][:6]))
        wanted_regions = ranked[: max(1, (days + 1) // 2)]
    wanted_regions = [slug for slug in wanted_regions if slug in by_region] or list(by_region)[:1]
    if not wanted_regions:
        return {"summary": "", "days": [], "tips": text["tips"]}

    used = set()

    def pick(region, categories, prefer_interest=True):
        options = [r for r in by_region[region] if r[0].category in categories and r[0].id not in used]
        if not options:
            return None, None
        best = max(options, key=lambda r: _score(r, interests if prefer_interest else [], budget))
        used.add(best[0].id)
        matched = next((i for i in interests if _find(_place_text(best[0]), INTERESTS[i])), None)
        return best[0], matched

    plan_days = []
    for index in range(days):
        region = wanted_regions[min(index * len(wanted_regions) // days, len(wanted_regions) - 1)]
        region_name = REGION_NAMES[region][language]
        slots = [("09:30", ("attraction", "tour"), "morning"), ("13:00", ("restaurant",), "lunch"),
                 ("15:30", ("attraction", "tour"), "afternoon")]
        if "food" in interests:
            slots.append(("19:30", ("restaurant",), "dinner"))
        if index < days - 1:  # a bed for every night of the trip
            slots.append(("18:00", ("hotel",), "hotel"))
        stops = []
        for time, categories, kind in slots:
            place, matched = pick(region, categories)
            if not place:
                continue
            # Sights and tours say which wish they match; meals and beds explain their slot in the day
            if matched and kind in ("morning", "afternoon"):
                reason = text["reasons"]["match"].format(interest=text["interests"][matched])
            else:
                reason = text["reasons"][kind].format(region=region_name)
            stops.append({"place_id": place.id, "time": time, "reason": reason})
        stops.sort(key=lambda stop: stop["time"])
        plan_days.append({
            "date": (start_date + datetime.timedelta(days=index)).isoformat(),
            "title": text["day"].format(region=region_name, n=index + 1),
            "stops": stops,
        })

    region_list = ", ".join(REGION_NAMES[slug][language] for slug in wanted_regions)
    focus = text["focus"].format(interests=", ".join(text["interests"][i] for i in interests)) if interests else ""
    return {
        "summary": text["summary"].format(days=days, regions=region_list, focus=focus),
        "days": [day for day in plan_days if day["stops"]],
        "tips": text["tips"],
    }
