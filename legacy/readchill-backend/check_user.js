const { db } = require("./config/firebase");

async function check() {
  const q = await db.collection("users").where("email", "==", "kittipan.g252@gmail.com").get();
  console.log("Users in users collection:");
  q.forEach(d => console.log(d.id, d.data()));

  const p = await db.collection("pre_approved_partners").where("email", "==", "kittipan.g252@gmail.com").get();
  console.log("\nUsers in pre_approved_partners:");
  p.forEach(d => console.log(d.id, d.data()));
  process.exit();
}
check();
