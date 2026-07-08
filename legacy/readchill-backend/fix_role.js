const { db } = require("./config/firebase");

async function fix() {
  const q = await db.collection("users").where("email", "==", "kittipan.g252@gmail.com").get();
  const promises = [];
  q.forEach(d => {
    console.log("Updating", d.id);
    promises.push(d.ref.update({ role: "partner", revenueShare: 73 }));
  });
  await Promise.all(promises);
  console.log("Fixed!");
  process.exit();
}
fix();
