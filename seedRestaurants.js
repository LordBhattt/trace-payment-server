// seedRestaurants.js - Run this file once to populate your database
const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Restaurant = require('./models/Restaurant');
const MenuCategory = require('./models/MenuCategory');
const MenuItem = require('./models/MenuItem');

const MONGO_URI = process.env.MONGO_URI;

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Restaurant.deleteMany({});
    await MenuCategory.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Restaurant 1: Pizza Paradise
    const pizzaParadise = await Restaurant.create({
      name: 'Pizza Paradise',
      description: 'Authentic Italian pizzas with fresh ingredients',
      coverImageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
      logoImageUrl: 'https://ui-avatars.com/api/?name=Pizza+Paradise&background=ff6b6b&color=fff',
      location: {
        lat: 18.5204,
        lon: 73.8567,
        address: 'FC Road, Pune',
      },
      cuisines: ['Italian', 'Pizza', 'Fast Food'],
      avgRating: 4.5,
      totalRatings: 1250,
      isVegOnly: false,
      deliveryRadiusKm: 8,
      preparationTimeMin: 25,
      discount: 25,
    });

    const pizzaCat1 = await MenuCategory.create({
      restaurantId: pizzaParadise._id,
      name: 'Pizzas',
      displayOrder: 1,
    });

    const pizzaCat2 = await MenuCategory.create({
      restaurantId: pizzaParadise._id,
      name: 'Sides',
      displayOrder: 2,
    });

    await MenuItem.create([
      {
        restaurantId: pizzaParadise._id,
        categoryId: pizzaCat1._id,
        category: 'Pizzas',
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato sauce, mozzarella, and basil',
        price: 249,
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
        isVeg: true,
        tags: ['bestseller', 'pizza'],
        rating: 4.6,
        ordersCount: 500,
      },
      {
        restaurantId: pizzaParadise._id,
        categoryId: pizzaCat1._id,
        category: 'Pizzas',
        name: 'Pepperoni Pizza',
        description: 'Loaded with pepperoni and cheese',
        price: 349,
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
        isVeg: false,
        tags: ['pizza', 'non-veg'],
        rating: 4.7,
        ordersCount: 450,
      },
      {
        restaurantId: pizzaParadise._id,
        categoryId: pizzaCat2._id,
        category: 'Sides',
        name: 'Garlic Bread',
        description: 'Crispy garlic bread with herbs',
        price: 99,
        imageUrl: 'https://images.unsplash.com/photo-1573140401552-388e7c8b8b72?w=400',
        isVeg: true,
        tags: ['sides'],
        rating: 4.4,
      },
    ]);

    // Restaurant 2: Burger Hub
    const burgerHub = await Restaurant.create({
      name: 'Burger Hub',
      description: 'Juicy burgers and loaded fries',
      coverImageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800',
      logoImageUrl: 'https://ui-avatars.com/api/?name=Burger+Hub&background=ffd93d&color=000',
      location: {
        lat: 18.5314,
        lon: 73.8446,
        address: 'Koregaon Park, Pune',
      },
      cuisines: ['American', 'Fast Food', 'Burgers'],
      avgRating: 4.3,
      totalRatings: 890,
      isVegOnly: false,
      deliveryRadiusKm: 6,
      preparationTimeMin: 20,
      discount: 15,
    });

    const burgerCat1 = await MenuCategory.create({
      restaurantId: burgerHub._id,
      name: 'Burgers',
      displayOrder: 1,
    });

    const burgerCat2 = await MenuCategory.create({
      restaurantId: burgerHub._id,
      name: 'Beverages',
      displayOrder: 2,
    });

    await MenuItem.create([
      {
        restaurantId: burgerHub._id,
        categoryId: burgerCat1._id,
        category: 'Burgers',
        name: 'Classic Cheese Burger',
        description: 'Beef patty with cheese, lettuce, tomato',
        price: 199,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        isVeg: false,
        tags: ['bestseller', 'burger'],
        rating: 4.5,
        ordersCount: 320,
      },
      {
        restaurantId: burgerHub._id,
        categoryId: burgerCat1._id,
        category: 'Burgers',
        name: 'Veg Delight Burger',
        description: 'Crispy veg patty with special sauce',
        price: 149,
        imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400',
        isVeg: true,
        tags: ['burger', 'veg'],
        rating: 4.2,
        ordersCount: 280,
      },
      {
        restaurantId: burgerHub._id,
        categoryId: burgerCat2._id,
        category: 'Beverages',
        name: 'Coke',
        description: 'Chilled Coca-Cola',
        price: 40,
        imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
        isVeg: true,
        tags: ['beverage'],
        rating: 4.0,
      },
    ]);

    // Restaurant 3: Biryani House
    const biryaniHouse = await Restaurant.create({
      name: 'Biryani House',
      description: 'Authentic Hyderabadi biryanis',
      coverImageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
      logoImageUrl: 'https://ui-avatars.com/api/?name=Biryani+House&background=e74c3c&color=fff',
      location: {
        lat: 18.5074,
        lon: 73.8077,
        address: 'Shivaji Nagar, Pune',
      },
      cuisines: ['Indian', 'Biryani', 'North Indian'],
      avgRating: 4.7,
      totalRatings: 2100,
      isVegOnly: false,
      deliveryRadiusKm: 7,
      preparationTimeMin: 35,
      discount: 20,
    });

    const biryanCat1 = await MenuCategory.create({
      restaurantId: biryaniHouse._id,
      name: 'Biryani',
      displayOrder: 1,
    });

    const biryanCat2 = await MenuCategory.create({
      restaurantId: biryaniHouse._id,
      name: 'Starters',
      displayOrder: 2,
    });

    await MenuItem.create([
      {
        restaurantId: biryaniHouse._id,
        categoryId: biryanCat1._id,
        category: 'Biryani',
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice with tender chicken',
        price: 299,
        imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
        isVeg: false,
        tags: ['bestseller', 'biryani', 'non-veg'],
        rating: 4.8,
        ordersCount: 850,
      },
      {
        restaurantId: biryaniHouse._id,
        categoryId: biryanCat1._id,
        category: 'Biryani',
        name: 'Veg Biryani',
        description: 'Mixed vegetables with fragrant rice',
        price: 199,
        imageUrl: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=400',
        isVeg: true,
        tags: ['biryani', 'veg'],
        rating: 4.5,
        ordersCount: 520,
      },
      {
        restaurantId: biryaniHouse._id,
        categoryId: biryanCat2._id,
        category: 'Starters',
        name: 'Chicken 65',
        description: 'Spicy fried chicken pieces',
        price: 180,
        imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=400',
        isVeg: false,
        tags: ['starter', 'spicy'],
        rating: 4.6,
      },
    ]);

    // Restaurant 4: Veg Delight (Pure Veg)
    const vegDelight = await Restaurant.create({
      name: 'Veg Delight',
      description: 'Pure vegetarian Indian cuisine',
      coverImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
      logoImageUrl: 'https://ui-avatars.com/api/?name=Veg+Delight&background=27ae60&color=fff',
      location: {
        lat: 18.5196,
        lon: 73.8553,
        address: 'Deccan, Pune',
      },
      cuisines: ['Indian', 'North Indian', 'South Indian'],
      avgRating: 4.4,
      totalRatings: 760,
      isVegOnly: true,
      deliveryRadiusKm: 5,
      preparationTimeMin: 28,
      discount: 10,
    });

    const vegCat1 = await MenuCategory.create({
      restaurantId: vegDelight._id,
      name: 'Main Course',
      displayOrder: 1,
    });

    await MenuItem.create([
      {
        restaurantId: vegDelight._id,
        categoryId: vegCat1._id,
        category: 'Main Course',
        name: 'Paneer Butter Masala',
        description: 'Cottage cheese in rich tomato gravy',
        price: 220,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
        isVeg: true,
        tags: ['bestseller', 'north-indian'],
        rating: 4.7,
        ordersCount: 410,
      },
      {
        restaurantId: vegDelight._id,
        categoryId: vegCat1._id,
        category: 'Main Course',
        name: 'Dal Tadka',
        description: 'Yellow lentils tempered with spices',
        price: 150,
        imageUrl: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400',
        isVeg: true,
        tags: ['dal', 'indian'],
        rating: 4.3,
        ordersCount: 290,
      },
    ]);

    console.log('✅ Seed data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - ${await Restaurant.countDocuments()} restaurants`);
    console.log(`  - ${await MenuCategory.countDocuments()} categories`);
    console.log(`  - ${await MenuItem.countDocuments()} menu items`);
    
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  } catch (err) {
    console.error('❌ Seed Error:', err);
    process.exit(1);
  }
};

seedData();