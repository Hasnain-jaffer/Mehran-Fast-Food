/**
 * Seed Script
 * Populates the database with initial data on first run
 * Run with: npm run seed
 */

// Same local-DNS workaround as server.js, and same reasoning: only needed
// outside production (see server.js for the full explanation).
if (process.env.NODE_ENV !== 'production') {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Category = require('../models/Category');
const Deal = require('../models/Deal');
const MenuItem = require('../models/MenuItem');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mehran';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep data)
    // await User.deleteMany({});
    // await Category.deleteMany({});
    // await Deal.deleteMany({});
    // await MenuItem.deleteMany({});

    // NOTE: this script intentionally does NOT create an admin user.
    // The first admin must be inserted manually directly in MongoDB
    // (Atlas or Compass) — see backend/docs/ADMIN_SETUP.md for the exact
    // JSON document and instructions. This avoids ever shipping a known,
    // documented default admin password to production.

    // ========== SEED CATEGORIES ==========
    const categories = [
      { name: 'Tikka', image: 'https://picsum.photos/seed/mehran-tikka/400/300', sortOrder: 1, icon: 'outdoor_grill' },
      { name: 'Zinger Burgers', image: 'https://picsum.photos/seed/mehran-burgers/400/300', sortOrder: 2, icon: 'lunch_dining' },
      { name: 'Crispy Rolls', image: 'https://picsum.photos/seed/mehran-rolls/400/300', sortOrder: 3, icon: 'wrap_text' },
      { name: 'Desserts', image: 'https://picsum.photos/seed/mehran-desserts/400/300', sortOrder: 4, icon: 'icecream' },
      { name: 'Drinks', image: 'https://picsum.photos/seed/mehran-drinks/400/300', sortOrder: 5, icon: 'local_bar' },
      { name: 'Falooda', image: 'https://picsum.photos/seed/mehran-falooda/400/300', sortOrder: 6, icon: 'bakery_dining' }
    ];

    for (const cat of categories) {
      const exists = await Category.findOne({ name: cat.name });
      if (!exists) {
        await Category.create(cat);
        console.log(`✅ Category created: ${cat.name}`);
      } else if (!exists.image) {
        exists.image = cat.image;
        await exists.save();
        console.log(`🖼️  Backfilled image for category: ${cat.name}`);
      }
    }

    // ========== SEED DEALS (as specified) ==========
    const dealsData = [
      { dealNumber: 11, title: '2 Tikka, 2 Paratha, 1 Cold Drink', items: ['2 Chicken Tikka', '2 Paratha', '1 Cold Drink 500ml'], price: 650 },
      { dealNumber: 12, title: '2 Tikka, 2 Falooda', items: ['2 Chicken Tikka', '2 Royal Falooda'], price: 750 },
      { dealNumber: 13, title: '3 Tikka, 1 Jumbo Crispy Roll, 1 Cold Drink', items: ['3 Chicken Tikka', '1 Jumbo Crispy Roll', '1 Cold Drink 500ml'], price: 1000 },
      { dealNumber: 14, title: '1 Tikka, 2 Paratha, 1 Cold Drink', items: ['1 Chicken Tikka', '2 Paratha', '1 Cold Drink 500ml'], price: 450 },
      { dealNumber: 15, title: '2 Small Crispy Roll, 1 Zinger Burger + Fries, 1 Cold Drink', items: ['2 Small Crispy Roll', '1 Zinger Burger', '1 Regular Fries', '1 Cold Drink 500ml'], price: 650 },
      { dealNumber: 16, title: '3 Jumbo Crispy Roll, 3 Medium Ice Cream', items: ['3 Jumbo Crispy Roll', '3 Medium Ice Cream'], price: 950 },
      { dealNumber: 17, title: '2 Zinger Burger, 1 Boti Roll + Fries', items: ['2 Zinger Burger', '1 Boti Roll', '1 Regular Fries'], price: 600 },
      { dealNumber: 18, title: '1 Zinger Burger, 1 Boti Roll, 1 Cold Drink', items: ['1 Zinger Burger', '1 Boti Roll', '1 Cold Drink 500ml'], price: 450 },
      { dealNumber: 19, title: '2 Boti Roll, 2 Ice Cream', items: ['2 Boti Roll', '2 Ice Cream'], price: 400 },
      { dealNumber: 20, title: '2 Tikka, 1 Jumbo Crispy Roll, 1 Cold Drink', items: ['2 Chicken Tikka', '1 Jumbo Crispy Roll', '1 Cold Drink 500ml'], price: 850 }
    ];

    for (const deal of dealsData) {
      const image = `https://picsum.photos/seed/mehran-deal-${deal.dealNumber}/400/300`;
      const exists = await Deal.findOne({ dealNumber: deal.dealNumber });
      if (!exists) {
        await Deal.create({
          ...deal,
          image,
          isAvailable: true,
          isPopular: deal.dealNumber === 11 || deal.dealNumber === 13,
          sortOrder: deal.dealNumber
        });
        console.log(`✅ Deal created: ${deal.title} - Rs. ${deal.price}`);
      } else if (!exists.image) {
        exists.image = image;
        await exists.save();
        console.log(`🖼️  Backfilled image for Deal #${deal.dealNumber}`);
      }
    }

    // ========== SEED SAMPLE MENU ITEMS ==========
    const tikkaCat = await Category.findOne({ name: 'Tikka' });
    const burgerCat = await Category.findOne({ name: 'Zinger Burgers' });
    const rollCat = await Category.findOne({ name: 'Crispy Rolls' });
    const dessertCat = await Category.findOne({ name: 'Desserts' });
    const drinkCat = await Category.findOne({ name: 'Drinks' });
    const faloodaCat = await Category.findOne({ name: 'Falooda' });

    const menuItems = [
      { name: 'Chicken Tikka (Quarter)', description: 'Smoky flame-grilled leg or breast piece', price: 450, category: tikkaCat?._id, isPopular: true },
      { name: 'Seekh Kebab Roll', description: 'Traditional minced meat kebab in paratha', price: 320, category: rollCat?._id },
      { name: 'Special Crispy Roll', description: 'Crunchy zinger-style chicken with garlic mayo', price: 380, category: rollCat?._id },
      { name: 'Zinger Burger', description: 'Hand-breaded spicy chicken, fresh lettuce, secret mayo', price: 550, category: burgerCat?._id, isPopular: true },
      { name: 'Double Zinger Burger', description: 'Two spicy fillets, double cheese, extra sauce', price: 750, category: burgerCat?._id },
      { name: 'Royal Falooda', description: 'Traditional falooda with vermicelli, basil seeds, rose syrup', price: 350, category: faloodaCat?._id, isPopular: true },
      { name: 'Gulab Jamun', description: 'Soft milk-solid dumplings in rose syrup', price: 200, category: dessertCat?._id },
      { name: 'Coke 500ml', description: 'Chilled Coca-Cola', price: 80, category: drinkCat?._id },
      { name: 'Mint Margarita', description: 'Fresh mint lemonade with a twist', price: 250, category: drinkCat?._id },
      { name: 'Mango Lassi', description: 'Thick yogurt drink with Sindhri mangoes', price: 320, category: drinkCat?._id }
    ];

    for (const item of menuItems) {
      if (!item.category) continue;
      const image = `https://picsum.photos/seed/mehran-item-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/400/300`;
      const exists = await MenuItem.findOne({ name: item.name });
      if (!exists) {
        await MenuItem.create({ ...item, image });
        console.log(`✅ Menu item created: ${item.name} - Rs. ${item.price}`);
      } else if (!exists.image) {
        exists.image = image;
        await exists.save();
        console.log(`🖼️  Backfilled image for: ${item.name}`);
      }
    }

    console.log('\n🎉 Seed complete! (categories, deals, menu items)');
    console.log('\n👤 No admin account was created — see backend/docs/ADMIN_SETUP.md');
    console.log('   to create your first admin directly in the database.');
    console.log('\n🍔 You can now start the server and test the API.');

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
