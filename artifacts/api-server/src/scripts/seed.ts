/**
 * Full test-data seed for an end-to-end driver-app simulation.
 *
 * Creates:
 *  - 1 driver account (profile already completed -> can accept deliveries immediately)
 *  - 1 restaurant owner + a fully stocked restaurant with a menu
 *  - 1 customer with a delivery address near the driver's starting location
 *  - Order #1: status "ready", unassigned -> shows up in "Available orders" for the driver to accept
 *  - Order #2: status "picked_up", already assigned to the seeded driver -> ready to test the
 *    live-tracking / map / OTP hand-off screen immediately after login
 *  - Order #3: status "delivered" (history) -> populates the earnings screen with real numbers
 *
 * Usage: pnpm --filter @workspace/api-server run seed
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  driversTable,
  restaurantsTable,
  menuItemsTable,
  ordersTable,
  orderItemsTable,
  addressesTable,
  driverEarningsTable,
  generateUniqueOrderReference,
  generateKitchenCode,
  generatePickupCode,
} from "@workspace/db";

const DRIVER_EMAIL = "driver.test@jatek.app";
const DRIVER_PASSWORD = "Driver123!";
const CUSTOMER_EMAIL = "client.test@jatek.app";
const CUSTOMER_PASSWORD = "Client123!";
const OWNER_EMAIL = "owner.test@jatek.app";
const OWNER_PASSWORD = "Owner123!";

// Casablanca coordinates so the map/GPS screens have realistic-looking data.
const RESTAURANT_LAT = 33.5731;
const RESTAURANT_LNG = -7.5898;
const CUSTOMER_LAT = 33.5892;
const CUSTOMER_LNG = -7.6036;
const DRIVER_START_LAT = 33.575;
const DRIVER_START_LNG = -7.593;

async function upsertUser(opts: {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
}) {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, opts.email)).limit(1);
  if (existing) return existing;
  const hashed = await bcrypt.hash(opts.password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      name: opts.name,
      email: opts.email,
      password: hashed,
      role: opts.role,
      phone: opts.phone,
      isActive: true,
      loyaltyPoints: 0,
    })
    .returning();
  return user;
}

async function main() {
  console.log("🌱 Seeding Jatek test data...\n");

  // ── Users ──────────────────────────────────────────────────────────────
  const driverUser = await upsertUser({
    name: "Yassine Livreur",
    email: DRIVER_EMAIL,
    password: DRIVER_PASSWORD,
    role: "driver",
    phone: "+212600000001",
  });

  const customerUser = await upsertUser({
    name: "Sara Client",
    email: CUSTOMER_EMAIL,
    password: CUSTOMER_PASSWORD,
    role: "customer",
    phone: "+212600000002",
  });

  const ownerUser = await upsertUser({
    name: "Karim Restaurateur",
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    role: "restaurant_owner",
    phone: "+212600000003",
  });

  console.log(`✔ Driver:   ${DRIVER_EMAIL} / ${DRIVER_PASSWORD}`);
  console.log(`✔ Client:   ${CUSTOMER_EMAIL} / ${CUSTOMER_PASSWORD}`);
  console.log(`✔ Owner:    ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);

  // ── Driver profile (pre-completed so the app never gates on onboarding) ──
  let [driver] = await db.select().from(driversTable).where(eq(driversTable.userId, driverUser.id)).limit(1);
  if (!driver) {
    [driver] = await db
      .insert(driversTable)
      .values({
        userId: driverUser.id,
        name: driverUser.name,
        phone: driverUser.phone,
        vehicleType: "scooter",
        vehiclePlate: "12345-A-6",
        nationalId: "AB123456",
        licenseNumber: "PL998877",
        profileCompletedAt: new Date(),
        isAvailable: true,
        totalDeliveries: 24,
        totalEarnings: 860,
        rating: 4.8,
        latitude: DRIVER_START_LAT,
        longitude: DRIVER_START_LNG,
        locationUpdatedAt: new Date(),
      })
      .returning();
  } else {
    [driver] = await db
      .update(driversTable)
      .set({
        vehicleType: driver.vehicleType ?? "scooter",
        vehiclePlate: driver.vehiclePlate ?? "12345-A-6",
        nationalId: driver.nationalId ?? "AB123456",
        profileCompletedAt: driver.profileCompletedAt ?? new Date(),
        isAvailable: true,
        latitude: DRIVER_START_LAT,
        longitude: DRIVER_START_LNG,
        locationUpdatedAt: new Date(),
      })
      .where(eq(driversTable.id, driver.id))
      .returning();
  }
  console.log(`✔ Driver profile completed (id=${driver.id}), online near Casablanca centre-ville`);

  // ── Customer delivery address ─────────────────────────────────────────
  const [existingAddress] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, customerUser.id))
    .limit(1);
  if (!existingAddress) {
    await db.insert(addressesTable).values({
      userId: customerUser.id,
      label: "Maison",
      fullAddress: "Résidence Al Manar, Rue Ibnou Sina, Maârif, Casablanca",
      details: "3ème étage, porte 12, interphone Sara",
      isDefault: true,
    });
  }

  // ── Restaurant ────────────────────────────────────────────────────────
  let [restaurant] = await db.select().from(restaurantsTable).where(eq(restaurantsTable.ownerId, ownerUser.id)).limit(1);
  if (!restaurant) {
    [restaurant] = await db
      .insert(restaurantsTable)
      .values({
        ownerId: ownerUser.id,
        name: "Chez Karim Grill",
        description: "Grillades marocaines et sandwichs faits maison, préparés minute.",
        address: "12 Boulevard Zerktouni, Casablanca",
        phone: "+212522000000",
        category: "Grillades",
        businessType: "restaurant",
        isOpen: true,
        deliveryTime: 25,
        deliveryFee: 15,
        minimumOrder: 50,
        rating: 4.6,
        reviewCount: 128,
        isVerified: true,
        legalName: "Karim Grill SARL",
        profileCompletedAt: new Date(),
        latitude: RESTAURANT_LAT,
        longitude: RESTAURANT_LNG,
      })
      .returning();
  }
  console.log(`✔ Restaurant: ${restaurant.name} (id=${restaurant.id})`);

  // ── Menu ──────────────────────────────────────────────────────────────
  const existingMenu = await db.select().from(menuItemsTable).where(eq(menuItemsTable.restaurantId, restaurant.id));
  let menu = existingMenu;
  if (existingMenu.length === 0) {
    menu = await db
      .insert(menuItemsTable)
      .values([
        {
          restaurantId: restaurant.id,
          name: "Brochettes de poulet",
          description: "4 brochettes marinées, servies avec frites et salade",
          price: 55,
          category: "Grillades",
          isAvailable: true,
          isPopular: true,
          tags: ["halal"],
          prepTimeMinutes: 15,
        },
        {
          restaurantId: restaurant.id,
          name: "Kefta au fromage",
          description: "Sandwich kefta grillée, fromage fondu, pain maison",
          price: 40,
          category: "Sandwichs",
          isAvailable: true,
          isPopular: true,
          tags: ["halal"],
          prepTimeMinutes: 10,
        },
        {
          restaurantId: restaurant.id,
          name: "Jus d'orange frais",
          description: "Pressé minute",
          price: 15,
          category: "Boissons",
          isAvailable: true,
          isPopular: false,
          prepTimeMinutes: 3,
        },
      ])
      .returning();
  }
  console.log(`✔ Menu: ${menu.length} article(s)`);

  const [item1, item2, item3] = menu;

  async function createOrder(opts: {
    status: string;
    driverId: number | null;
    subtotal: number;
    deliveryFee: number;
    total: number;
    items: { menuItemId: number; menuItemName: string; quantity: number; unitPrice: number }[];
    createdMinutesAgo?: number;
  }) {
    const reference = await generateUniqueOrderReference();
    const [order] = await db
      .insert(ordersTable)
      .values({
        reference,
        userId: customerUser.id,
        restaurantId: restaurant.id,
        driverId: opts.driverId,
        restaurantName: restaurant.name,
        userName: customerUser.name,
        status: opts.status,
        subtotal: opts.subtotal,
        deliveryFee: opts.deliveryFee,
        discountAmount: 0,
        total: opts.total,
        deliveryAddress: "Résidence Al Manar, Rue Ibnou Sina, Maârif, Casablanca",
        notes: "Sonnez à l'interphone, merci !",
        estimatedDeliveryTime: 25,
        kitchenCode: generateKitchenCode(),
        pickupCode: generatePickupCode(),
        deliveryType: "asap",
        isContactless: false,
      })
      .returning();

    await db.insert(orderItemsTable).values(
      opts.items.map((i) => ({
        orderId: order.id,
        menuItemId: i.menuItemId,
        menuItemName: i.menuItemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.unitPrice * i.quantity,
      })),
    );

    if (opts.createdMinutesAgo) {
      const createdAt = new Date(Date.now() - opts.createdMinutesAgo * 60_000);
      await db.update(ordersTable).set({ createdAt, updatedAt: createdAt }).where(eq(ordersTable.id, order.id));
    }

    return order;
  }

  // Order 1 — ready & unassigned, so it appears in "commandes disponibles"
  const order1Subtotal = item1.price * 1 + item3.price * 1;
  const order1 = await createOrder({
    status: "ready",
    driverId: null,
    subtotal: order1Subtotal,
    deliveryFee: restaurant.deliveryFee ?? 15,
    total: order1Subtotal + (restaurant.deliveryFee ?? 15),
    items: [
      { menuItemId: item1.id, menuItemName: item1.name, quantity: 1, unitPrice: item1.price },
      { menuItemId: item3.id, menuItemName: item3.name, quantity: 1, unitPrice: item3.price },
    ],
  });
  console.log(`✔ Commande #${order1.reference} — status "ready", non-assignée (à accepter)`);
  console.log(`   Code de remise client (OTP) : ${order1.pickupCode}`);

  // Order 2 — already picked up by our seeded driver, ready to test live tracking + OTP hand-off
  const order2Subtotal = item2.price * 2;
  const order2 = await createOrder({
    status: "picked_up",
    driverId: driver.id,
    subtotal: order2Subtotal,
    deliveryFee: restaurant.deliveryFee ?? 15,
    total: order2Subtotal + (restaurant.deliveryFee ?? 15),
    items: [{ menuItemId: item2.id, menuItemName: item2.name, quantity: 2, unitPrice: item2.price }],
    createdMinutesAgo: 8,
  });
  console.log(`✔ Commande #${order2.reference} — status "picked_up", assignée au driver de test`);
  console.log(`   Code de remise client (OTP) : ${order2.pickupCode}  <-- à saisir dans l'app pour finaliser la livraison`);

  // Order 3 — delivered history, feeds earnings/history screens
  const order3Subtotal = item1.price * 2 + item2.price * 1;
  const order3Total = order3Subtotal + (restaurant.deliveryFee ?? 15);
  const order3 = await createOrder({
    status: "delivered",
    driverId: driver.id,
    subtotal: order3Subtotal,
    deliveryFee: restaurant.deliveryFee ?? 15,
    total: order3Total,
    items: [
      { menuItemId: item1.id, menuItemName: item1.name, quantity: 2, unitPrice: item1.price },
      { menuItemId: item2.id, menuItemName: item2.name, quantity: 1, unitPrice: item2.price },
    ],
    createdMinutesAgo: 180,
  });
  const earning3 = Math.round((restaurant.deliveryFee ?? 15) * 0.8 * 100) / 100;
  const [existingEarning] = await db
    .select()
    .from(driverEarningsTable)
    .where(eq(driverEarningsTable.orderId, order3.id))
    .limit(1);
  if (!existingEarning) {
    await db.insert(driverEarningsTable).values({
      driverId: driver.id,
      orderId: order3.id,
      amount: earning3,
      type: "delivery",
      note: `Livraison ${order3.reference}`,
    });
  }
  console.log(`✔ Commande #${order3.reference} — status "delivered" (historique, alimente les gains)`);

  console.log("\n🎉 Seed terminé — données prêtes pour une simulation complète de bout en bout.\n");
  console.log("── Identifiants de test ──────────────────────────────");
  console.log(`Driver :   ${DRIVER_EMAIL} / ${DRIVER_PASSWORD}`);
  console.log(`Client :   ${CUSTOMER_EMAIL} / ${CUSTOMER_PASSWORD}`);
  console.log(`Owner  :   ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  console.log("───────────────────────────────────────────────────────");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
