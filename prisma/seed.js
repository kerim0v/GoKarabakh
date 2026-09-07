const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const trips = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'app', 'data', 'mockData.json'), 'utf8'),
);

const seedOwner = {
  id: 'mock-catalog-owner',
  email: 'mock-catalog@gokarabakh.local',
  name: 'GoKarabakh Mock Catalog',
  passwordHash: 'mock-seed-account-not-for-login',
  role: 'ADMIN',
};

const now = new Date();

async function main() {
  await prisma.user.upsert({
    where: { id: seedOwner.id },
    update: {
      email: seedOwner.email,
      name: seedOwner.name,
      passwordHash: seedOwner.passwordHash,
      role: seedOwner.role,
      updatedAt: now,
    },
    create: { ...seedOwner, createdAt: now, updatedAt: now },
  });

  const hotels = trips.filter((trip) => trip.category === 'hotel');
  const restaurants = trips.filter((trip) => trip.category === 'restaurant');
  const tours = trips.filter((trip) => trip.category === 'tour');

  for (const hotel of hotels) {
    await prisma.hotel.upsert({
      where: { id: hotel.id },
      update: {
        name: hotel.title,
        city: hotel.location,
        address: hotel.address,
        description: hotel.description,
        rating: hotel.rating,
        priceRange: `${hotel.price} AZN/night`,
        imageUrl: hotel.image_url,
        updatedAt: now,
      },
      create: {
        id: hotel.id,
        name: hotel.title,
        city: hotel.location,
        address: hotel.address,
        description: hotel.description,
        rating: hotel.rating,
        priceRange: `${hotel.price} AZN/night`,
        imageUrl: hotel.image_url,
        amenities: [],
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  for (const restaurant of restaurants) {
    await prisma.restaurant.upsert({
      where: { id: restaurant.id },
      update: {
        name: restaurant.title,
        city: restaurant.location,
        address: restaurant.address,
        description: restaurant.description,
        rating: restaurant.rating,
        priceRange: `${restaurant.price} AZN/person`,
        imageUrl: restaurant.image_url,
        updatedAt: now,
      },
      create: {
        id: restaurant.id,
        name: restaurant.title,
        city: restaurant.location,
        address: restaurant.address,
        description: restaurant.description,
        rating: restaurant.rating,
        priceRange: `${restaurant.price} AZN/person`,
        imageUrl: restaurant.image_url,
        cuisine: ['Azerbaijani'],
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  for (const tour of tours) {
    await prisma.place.upsert({
      where: { id: tour.id },
      update: {
        name: tour.title,
        isTour: true,
        cost: tour.price,
        description: tour.description,
        mainPhotoUrl: tour.image_url,
        tags: [tour.category, tour.location.toLowerCase()],
        updatedAt: now,
      },
      create: {
        id: tour.id,
        ownerUserId: seedOwner.id,
        name: tour.title,
        isTour: true,
        cost: tour.price,
        description: tour.description,
        mainPhotoUrl: tour.image_url,
        tags: [tour.category, tour.location.toLowerCase()],
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  console.log(`Seeded ${hotels.length} hotels, ${restaurants.length} restaurants, ${tours.length} tours, and 1 catalog user.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
