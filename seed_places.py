"""
Seeds the district content (hotels, restaurants, attractions, tours) as Place rows,
owned by a system "content" account that has no password and can't be logged into.

Safe to run more than once - existing places are skipped:
    flask --app server seed      (or: python seed_places.py)
"""
from app.models.place import Place
from app.models.user import User
from app.services import facade

CONTENT_OWNER_EMAIL = "content@gokarabakh.local"

# region: [(category, name, subtitle, description, badge, image, cost in AZN)]
SHUSHA = [
    ("hotel", "Shusha Hotel", "Centre • for 2 guests", "A short walk from the historic centre, with morning views over the town.", "From 140 AZN / night", "/shusha/shusha-hotel.jpg", 140),
    ("hotel", "Jidir View House", "Jidir Plain • rooms with a view", "A quiet place to watch the sunset and spend a calm night.", "Scenic pick", "/cidir-1.jpg", 120),
    ("hotel", "Karvansara Guest Rooms", "Near Shusha Fortress", "Classic atmosphere and easy access to the main stops.", "Central location", "/shusha/shusha2.JPG", 110),
    ("attraction", "Jidir Plain", "Panoramic stop • sunset", "Cliffs and valley views - an ideal spot for a short walk.", "20–40 min", "/cidir-2.jpg", 0),
    ("attraction", "Shusha Fortress", "Historic site • town centre", "The key stop on any route for a feel of the town's past.", "History & architecture", "/shusha/shusha3.JPG", 0),
    ("attraction", "Kharibulbul Trail", "Nature walk • easy route", "A short path through Shusha's natural landscape at a calm pace.", "Best in the morning", "/cidir-3.jpg", 0),
    ("restaurant", "Qala Süfrəsi", "Azerbaijani cuisine • centre", "A warm lunch break with plov, saj and seasonal local dishes.", "Average 25–40 AZN", "/shusha/shusha4.JPG", 30),
    ("restaurant", "Jidir Tea House", "Tea & sweets • view", "Tea, jam and light snacks after a walk.", "Before sunset", "/cidir-1.jpg", 15),
    ("restaurant", "Shusha Kitchen", "Family place • local flavours", "A relaxed choice for a long dinner at the end of the day.", "Booking recommended", "/shusha/shusha2.JPG", 35),
    ("tour", "Shusha Centre Walk", "2–3 hours • on foot", "A route that joins the fortress, cultural stops and local food.", "Ready route", "/shusha/shusha3.JPG", 25),
]

KHANKENDI = [
    ("hotel", "Karvansaray", "Khankendi • city centre", "Comfortable overnight in the city centre with local hospitality.", "From 146 AZN / night", "/khankendi/xankendiotel.jpg", 146),
    ("hotel", "Cahan Hotel", "Cahan • mountain escape", "Mountain views and a quiet setting for a peaceful stay.", "Guest favourite", "/khankendi/cahanotel.jpg", 120),
    ("hotel", "Valley House", "Khankendi • valley views", "A welcoming option with regional character and easy access.", "Best for a weekend", "/khankendi/khankendi.jpeg", 120),
    ("attraction", "Khankendi City Centre", "Urban walk • cultural spots", "The main stops and cultural landmarks worth visiting on your route.", "Must see", "/khankendi/khankendi.jpeg", 0),
    ("attraction", "Valley Viewpoint", "Scenic lookout • easy access", "A short walk to see the valley and the surrounding horizons.", "Allow 30–40 min", "/khankendi/khankendi2.jpg", 0),
    ("attraction", "Local Market", "Cultural experience • daytime", "The heart of local life and the best place to see everyday Khankendi.", "Morning pick", "/khankendi/khankendi.jpeg", 0),
    ("restaurant", "Khankendi Kitchen", "Regional cuisine • central", "Classic Azerbaijani flavours in a welcoming, unhurried setting.", "Average 25–40 AZN", "/khankendi/khankendi.jpeg", 30),
    ("restaurant", "Valley Tea House", "Tea & sweets • relaxed", "Tea, local preserves and a peaceful break.", "Afternoon favourite", "/khankendi/khankendi2.jpg", 15),
    ("restaurant", "Cahan Restaurant", "Mountain cuisine • family-friendly", "A good choice for finishing a full day of exploring.", "Booking recommended", "/khankendi/khankendi.jpeg", 35),
    ("tour", "Khankendi Valley Walk", "2 hours • on foot", "A simple route that combines city views with local atmosphere.", "Top pick", "/khankendi/khankendi.jpeg", 20),
    ("tour", "Cahan Mountain Experience", "Day trip • highland heritage", "Explore the mountains and their hospitality in one day.", "Traveller favourite", "/khankendi/cahanotel.jpg", 60),
]

# name, setting, attractions[3], images[3]
REGION_TRAVEL_DATA = {
    "kalbajar": ("Kalbajar", "Highland Pass", ["Istisu Springs", "Alpine Passes", "Ancient Stone Sanctuaries"], ["/kelbecer/kelbecer.jpg", "/kelbecer/kelbecer2.jpeg", "/kelbecer/kelbecer3.jpeg"]),
    "lachin": ("Lachin", "Forest Valley", ["Lachin Valley Views", "Forest Valley Walk", "River Lookout"], ["/lacin/lacin.jpg", "/lacin/lacin2.jpeg", "/lacin/lacin3.jpg"]),
    "aghdam": ("Aghdam", "Heritage Plain", ["Heritage Plains", "Historic Route", "Open Horizon View"], ["/agdam/agdam.jpg", "/agdam/agdam2.jpg", "/agdam/agdam3.jpg"]),
    "khojaly": ("Khojaly", "Highland Landscape", ["Ancient Landscape", "Upland Viewpoint", "Quiet Country Route"], ["/khocali/khocali.jpg", "/khocali/khocali3.jpg", "/khocali/khocali.jpg"]),
    "khojavend": ("Khojavend", "Woodland Ridge", ["Woodland Slopes", "Hidden Trail", "Ridge Viewpoint"], ["/xocavend/xocavend.jpeg", "/xocavend/xocavend2.jpeg", "/xocavend/xocavend.jpeg"]),
    "qubadli": ("Qubadli", "Riverside Route", ["Riverside Route", "Green Ridge Walk", "Village Pathway"], ["/qubadli/qubadli.jpg", "/qubadli/qubadli2.jpg", "/qubadli/qubadli3.jpg"]),
    "zangilan": ("Zangilan", "Aras Valley", ["Aras Valley", "Plane Forest", "Nature Reserve"], ["/zengilan/zengilan.jpeg", "/zengilan/zengilan2.jpeg", "/zengilan/zengilan.jpeg"]),
}


def region_places(name, setting, spots, images):
    first, second, third = images
    return [
        ("hotel", f"{name} Panorama Stay", f"{setting} • mountain views", "A relaxed base with easy access to the region's key stops.", "From 140 AZN / night", first, 140),
        ("hotel", f"{setting} Guesthouse", "Local character • quiet setting", "A comfortable overnight option for an unhurried regional escape.", "Guest favourite", second, 90),
        ("hotel", f"{name} Mountain Lodge", "Scenic rooms • flexible stay", "Wake up close to the landscapes you came to explore.", "Best for a weekend", third, 120),
        ("attraction", spots[0], "Signature stop • scenic route", "Make this your first stop for a clear sense of the region's character.", "Must see", first, 0),
        ("attraction", spots[1], "Culture & landscape • easy pace", "A place to pause, take in the surroundings, and continue your route.", "Allow 30–60 min", second, 0),
        ("attraction", spots[2], "Local discovery • daytime", "A quieter experience for travellers who want to go beyond the main view.", "Morning pick", third, 0),
        ("restaurant", f"{name} Local Table", "Regional cuisine • central stop", "Classic Azerbaijani flavours between explorations.", "Average 25–40 AZN", first, 30),
        ("restaurant", f"{setting} Tea House", "Tea & sweets • relaxed pace", "Tea, preserves, and a light break with local atmosphere.", "Afternoon favourite", second, 15),
        ("restaurant", f"{name} Kitchen", "Family-friendly • local flavours", "An easy choice for finishing a full day on the road.", "Booking recommended", third, 35),
        ("tour", f"{name} Signature Walk", "2–3 hours • on foot", f"A simple route that pairs {spots[0]} with local atmosphere and views.", "Ready route", second, 25),
    ]


def all_places():
    yield from (("shusha", *p) for p in SHUSHA)
    yield from (("khankendi", *p) for p in KHANKENDI)
    for slug, data in REGION_TRAVEL_DATA.items():
        yield from ((slug, *p) for p in region_places(*data))


def get_or_create_content_owner():
    owner = facade.get_user_by_email(CONTENT_OWNER_EMAIL)
    if not owner:
        owner = User(kx_count=0, name="GoKarabakh Editorial", email=CONTENT_OWNER_EMAIL, role="owner")
        facade.create_user(owner)
    elif owner.pwd_hash:
        # Older seeds gave this account a password that was public in the repo
        facade.update_user(owner.id, {"pwd_hash": None})
    return owner


def seed():
    """Run inside an app context."""
    owner = get_or_create_content_owner()
    existing = {(p.region, p.name) for p in facade.places_by_owner(owner.id)}

    created = 0
    for region, category, name, subtitle, description, badge, image, cost in all_places():
        if (region, name) in existing:
            continue
        facade.create_place(Place(
            owner_user_id=owner.id,
            name=name,
            region=region,
            category=category,
            subtitle=subtitle,
            badge=badge,
            cost=cost,
            description=description,
            main_photo_url=image,
            tags=[],
        ))
        existing.add((region, name))
        created += 1
    return created


if __name__ == "__main__":
    from app import create_app

    with create_app().app_context():
        print(f"Seeded {seed()} places.")
