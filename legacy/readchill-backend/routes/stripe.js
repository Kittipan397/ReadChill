const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Endpoint: /api/stripe/create-checkout-session
router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { userId, amountBaht, coins, bonus } = req.body;

    if (!userId || !amountBaht || !coins) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const totalCoins = parseInt(coins) + parseInt(bonus || 0);

    // Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'promptpay'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: `ReadChill Coins: ${totalCoins.toLocaleString()} Coins`,
              description: `Top-up ${coins} coins${bonus ? ` + ${bonus} bonus` : ''}`,
            },
            unit_amount: parseInt(amountBaht) * 100, // Stripe expects amount in satang (cents)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/topup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/topup/cancel`,
      client_reference_id: userId,
      metadata: {
        userId,
        coinsToAdd: totalCoins,
        amountBaht
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Endpoint: /api/stripe/webhook
// Needs raw body for Stripe signature verification
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      // Verify signature if secret is configured
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // For local testing without CLI (unsafe in production)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Fulfill the purchase
    const userId = session.metadata.userId;
    const coinsToAdd = parseInt(session.metadata.coinsToAdd);
    
    try {
      const db = admin.firestore();
      
      // Prevent duplicate processing by checking if this session was already processed
      const txRef = db.collection('transactions').doc(session.id);
      const txDoc = await txRef.get();
      
      if (!txDoc.exists) {
        // Run as a batch or transaction
        const batch = db.batch();
        
        // 1. Update user coins
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
          coins: admin.firestore.FieldValue.increment(coinsToAdd)
        });
        
        // 2. Record transaction
        batch.set(txRef, {
          userId,
          amountBaht: parseInt(session.metadata.amountBaht),
          coinsAdded: coinsToAdd,
          paymentMethod: 'stripe',
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        console.log(`Successfully added ${coinsToAdd} coins to user ${userId}`);
      } else {
        console.log(`Session ${session.id} already processed`);
      }
    } catch (err) {
      console.error('Error fulfilling order in Firestore:', err);
      return res.status(500).json({error: 'Firestore update failed'});
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

module.exports = router;
