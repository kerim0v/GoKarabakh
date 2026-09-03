"""
One-time seed script: takes the district/hotel/restaurant/attraction content
that was hardcoded in frontend/src/App.jsx (DistrictPage) and creates it as
real Place rows, owned by a system "content" account.

Run once against the target database:
    python seed_places.py
"""
import re

import server
from app.database import db
from app.models.user import User
from app.services import facade

CONTENT_OWNER_EMAIL = "content@gokarabakh.local"
CONTENT_OWNER_PASSWORD = "ContentSeed123"

DISTRICTS = {
    "shusha": "Shusha",
    "kalbajar": "Kalbajar",
    "lachin": "Lachin",
    "khankendi": "Khankendi",
    "aghdam": "Aghdam",
    "khojaly": "Khojaly",
    "khojavend": "Khojavend",
    "qubadli": "Qubadli",
    "zangilan": "Zangilan",
}

# [name, subtitle, description, badge, image] - transcribed verbatim from App.jsx
SHUSHA_CARDS = {
    "Hotels": [
        ["Shusha Hotel", "Mərkəz • 2 nəfər üçün", "Tarixi mərkəzə piyada yaxın, səhər şəhər mənzərəsi ilə.", "Gecəlik 140 AZN-dən", "/shusha/shusha otel.jpg"],
        ["Cıdır View House", "Cıdır düzü • mənzərəli otaqlar", "Gün batımını izləmək və sakit bir gecə üçün seçilmiş ünvan.", "Mənzərəli seçim", "/cidir-1.jpg"],
        ["Karvansara Guest Rooms", "Şuşa qalası yaxınlığı", "Klassik atmosfer və əsas dayanacaqlara rahat çıxış.", "Mərkəzdə yerləşir", "/shusha/shusha2.JPG"],
    ],
    "Attractions": [
        ["Cıdır düzü", "Panoramik dayanacaq • gün batımı", "Qayalıqlar və vadi mənzərəsi ilə qısa gəzinti üçün ideal nöqtə.", "20–40 dəq.", "/cidir-2.jpg"],
        ["Şuşa qalası", "Tarixi məkan • şəhər mərkəzi", "Şəhərin keçmişini hiss etmək üçün marşrutun əsas dayanacağı.", "Tarix və memarlıq", "/shusha/shusha3.JPG"],
        ["Xarıbülbül izi", "Təbiət gəzintisi • yüngül marşrut", "Sakit tempdə Şuşanın təbii relyefini kəşf edən qısa yol.", "Səhər üçün ideal", "/cidir-3.jpg"],
    ],
    "Restaurants": [
        ["Qala Süfrəsi", "Azərbaycan mətbəxi • mərkəz", "Plov, sac və mövsümi yerli dadlarla isti nahar fasiləsi.", "Orta hesab 25–40 AZN", "/shusha/shusha4.JPG"],
        ["Cıdır Çay Evi", "Çay & şirniyyat • mənzərə", "Gəzintidən sonra çay, mürəbbə və yüngül qəlyanaltı üçün.", "Gün batımından əvvəl", "/cidir-1.jpg"],
        ["Şuşa Mətbəxi", "Ailəvi məkan • yerli ləzzətlər", "Uzun şam yeməyi və günü toplamaq üçün rahat seçim.", "Rezervasiya tövsiyə olunur", "/shusha/shusha2.JPG"],
    ],
    "The Most Popular": [
        ["Cıdırda gün batımı", "Görməli yer • ən çox seçilən", "İlk dəfə gələnlər üçün Şuşa təcrübəsinin ən yaddaqalan hissəsi.", "Top seçim", "/cidir-3.jpg"],
        ["Şuşa mərkəzi gəzintisi", "2–3 saat • piyada", "Qala, mədəniyyət dayanacaqları və yerli dadları birləşdirən marşrut.", "Hazır marşrut", "/shusha/shusha3.JPG"],
        ["Mənzərəli gecələmə", "Stay • Cıdır istiqaməti", "Səhəri dağ havası və vadinin açılan mənzərəsi ilə qarşılayın.", "Səyahətçilərin favoriti", "/shusha/shusha.JPG"],
    ],
}

KHANKENDI_CARDS = {
    "Hotels": [
        ["Karvansaray", "Xankendi • City Center", "Comfortable overnight in Khankendi city center with local hospitality.", "From 146 AZN / night", "/khankendi/xankendiotel.jpg"],
        ["Cahan Hotel", "Cahan • Mountain Escape", "Mountain views and quiet setting in Cahan region for a peaceful stay.", "Guest favourite", "/khankendi/cahanotel.jpg"],
        ["Valley House", "Khankendi • Valley Views", "Another welcoming option with regional character and easy access.", "Best for weekend", "/khankendi/khankendi.jpeg"],
    ],
    "Attractions": [
        ["Khankendi City Center", "Urban walk • cultural spots", "The main stops and cultural landmarks worth visiting on your route.", "Must see", "/khankendi/khankendi.jpeg"],
        ["Valley Viewpoint", "Scenic lookout • easy access", "A short walk to see the valley landscape and surrounding horizons.", "Allow 30–40 min", "/khankendi/khankendi2.jpg"],
        ["Local Market", "Cultural experience • daytime", "The heart of local life where you can explore authentic Khankendi.", "Morning pick", "/khankendi/khankendi.jpeg"],
    ],
    "Restaurants": [
        ["Khankendi Kitchen", "Regional cuisine • central", "Classic Azerbaijani flavours in a welcoming, unhurried setting.", "Average 25–40 AZN", "/khankendi/khankendi.jpeg"],
        ["Valley Tea House", "Tea & sweets • relaxed", "Settle in for tea, local preserves and a peaceful break.", "Afternoon favourite", "/khankendi/khankendi2.jpg"],
        ["Cahan Restaurant", "Mountain cuisine • family-friendly", "An excellent choice for finishing a full day of exploration.", "Booking recommended", "/khankendi/khankendi.jpeg"],
    ],
    "The Most Popular": [
        ["Khankendi Valley Walk", "2 hours • on foot", "A simple route that combines city views with local atmosphere.", "Top pick", "/khankendi/khankendi.jpeg"],
        ["Scenic Khankendi Stay", "Overnight • valley view", "Combine a slow morning, memorable views and comfortable nights.", "Most saved stay", "/khankendi/xankendi otel.jpg"],
        ["Cahan Mountain Experience", "Day trip • highland heritage", "Explore the mountain region and experience local mountain hospitality.", "Traveller favourite", "/khankendi/cahan otel.jpg"],
    ],
}

# name, setting, attractions[3], images[3] - matches regionTravelData in App.jsx
REGION_TRAVEL_DATA = {
    "kalbajar": {"name": "Kalbajar", "setting": "Highland Pass", "attractions": ["Istisu Springs", "Alpine Passes", "Ancient Stone Sanctuaries"], "images": ["/kelbecer/kelbecer.jpg", "/kelbecer/kelbecer2.jpeg", "/kelbecer/kelbecer3.jpeg"]},
    "lachin": {"name": "Lachin", "setting": "Forest Valley", "attractions": ["Lachin Corridor Views", "Forest Valley Walk", "River Lookout"], "images": ["/lacin/lacin.jpg", "/lacin/lacin2.jpeg", "/lacin/lacin3.jpg"]},
    "aghdam": {"name": "Aghdam", "setting": "Heritage Plain", "attractions": ["Heritage Plains", "Historic Route", "Open Horizon View"], "images": ["/agdam/agdam.jpg", "/agdam/agdam2.jpg", "/agdam/agdam3.jpg"]},
    "khojaly": {"name": "Khojaly", "setting": "Highland Landscape", "attractions": ["Ancient Landscape", "Upland Viewpoint", "Quiet Country Route"], "images": ["/khocali/khocali.jpg", "/khocali/khocali3.jpg", "/khocali/khocali.jpg"]},
    "khojavend": {"name": "Khojavend", "setting": "Woodland Ridge", "attractions": ["Woodland Slopes", "Hidden Trail", "Ridge Viewpoint"], "images": ["/xocavend/xocavend.jpeg", "/xocavend/xocavend2.jpeg", "/xocavend/xocavend.jpeg"]},
    "qubadli": {"name": "Qubadli", "setting": "Riverside Route", "attractions": ["Riverside Route", "Green Ridge Walk", "Village Pathway"], "images": ["/qubadli/qubadli.jpg", "/qubadli/qubadli2.jpg", "/qubadli/qubadli3.jpg"]},
    "zangilan": {"name": "Zangilan", "setting": "Aras Valley", "attractions": ["Aras Valley", "Plane Forest", "Nature Reserve"], "images": ["/zengilan/zengilan.jpeg", "/zengilan/zengilan2.jpeg", "/zengilan/zengilan.jpeg"]},
}


def build_region_cards(data):
    """Mirrors buildRegionCards() in App.jsx exactly."""
    first_image, second_image, third_image = data["images"]
    first_spot, second_spot, third_spot = data["attractions"]
    name, setting = data["name"], data["setting"]
    return {
        "Hotels": [
            [f"{name} Panorama Stay", f"{setting} • mountain views", "A relaxed base with easy access to the region's key stops.", "From 140 AZN / night", first_image],
            [f"{setting} Guesthouse", "Local character • quiet setting", "A comfortable overnight option for an unhurried regional escape.", "Guest favourite", second_image],
            [f"{name} Mountain Lodge", "Scenic rooms • flexible stay", "Wake up close to the landscapes you came to explore.", "Best for a weekend", third_image],
        ],
        "Attractions": [
            [first_spot, "Signature stop • scenic route", "Make this your first stop for a clear sense of the region's character.", "Must see", first_image],
            [second_spot, "Culture & landscape • easy pace", "A memorable place to pause, take in the surroundings, and continue your route.", "Allow 30–60 min", second_image],
            [third_spot, "Local discovery • daytime", "A quieter experience for travellers who want to explore beyond the main view.", "Morning pick", third_image],
        ],
        "Restaurants": [
            [f"{name} Local Table", "Regional cuisine • central stop", "A welcoming table for classic Azerbaijani flavours between explorations.", "Average 25–40 AZN", first_image],
            [f"{setting} Tea House", "Tea & sweets • relaxed pace", "Settle in for tea, preserves, and a light break with local atmosphere.", "Afternoon favourite", second_image],
            [f"{name} Kitchen", "Family-friendly • local flavours", "An easy choice for finishing a full day on the road.", "Booking recommended", third_image],
        ],
        "The Most Popular": [
            [first_spot, "Sightseeing • traveller favourite", "One of the region's most saved stops for first-time visitors.", "Top pick", first_image],
            [f"{name} Signature Walk", "2–3 hours • on foot", f"A simple route that pairs {first_spot} with local atmosphere and views.", "Ready route", second_image],
            [f"{name} Scenic Overnight", "Stay • close to nature", "Combine a slow morning, a memorable view, and a comfortable night.", "Most saved stay", third_image],
        ],
    }


DEFAULT_COST = {"Hotels": 120, "Restaurants": 30, "Attractions": 10, "The Most Popular": 50}


def cost_from_badge(badge, category):
    match = re.search(r"(\d+)", badge)
    if match:
        return float(match.group(1))
    return float(DEFAULT_COST[category])


def get_or_create_content_owner():
    owner = facade.get_user_by_email(CONTENT_OWNER_EMAIL)
    if owner:
        return owner
    owner = User(kx_count=0, name="GoKarabakh Editorial", email=CONTENT_OWNER_EMAIL, role="owner")
    owner.hash_pwd(CONTENT_OWNER_PASSWORD)
    facade.create_user(owner)
    return owner


def seed():
    with server.app.app_context():
        db.create_all()
        owner = get_or_create_content_owner()
        existing_keys = {
            (p.name, (p.tags or [None, None, None])[2])
            for p in facade.get_places() if p.owner_user_id == owner.id
        }

        created = 0
        for slug, district_name in DISTRICTS.items():
            if slug == "shusha":
                categories = SHUSHA_CARDS
            elif slug == "khankendi":
                categories = KHANKENDI_CARDS
            else:
                categories = build_region_cards(REGION_TRAVEL_DATA[slug])

            for category, cards in categories.items():
                for name, subtitle, description, badge, image in cards:
                    key = (name, category)
                    if key in existing_keys:
                        continue
                    from app.models.place import Place
                    place = Place(
                        owner_user_id=owner.id,
                        name=name,
                        is_tour=category in ("Attractions", "The Most Popular"),
                        cost=cost_from_badge(badge, category),
                        description=f"{subtitle} — {description} ({badge})",
                        main_photo_url=image,
                        tags=[slug, district_name, category],
                    )
                    facade.create_place(place)
                    existing_keys.add(key)
                    created += 1

        print(f"Seeded {created} places for content owner {owner.email} (id={owner.id})")


if __name__ == "__main__":
    seed()
