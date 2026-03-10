class OrderPlacedSubscriber {
  constructor({ eventBusService }) {
    this.eventBusService_ = eventBusService;
    eventBusService.subscribe("order.placed", this.handleOrderPlaced.bind(this));
    eventBusService.subscribe("order.payment_captured", this.handleOrderPlaced.bind(this));
  }

  async handleOrderPlaced({ id }) {
    const MAGAZZINO_URL = process.env.MAGAZZINO_URL || "http://backend:8000";
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "magazzino-webhook-secret";

    try {
      // Fetch order details from Medusa itself
      const response = await fetch(`${MAGAZZINO_URL}/api/webhook/medusa/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": WEBHOOK_SECRET,
        },
        body: JSON.stringify({ order_id: id }),
      });

      if (!response.ok) {
        console.error(`[Medusa→Magazzino] Webhook failed for order ${id}: ${response.status}`);
      } else {
        console.log(`[Medusa→Magazzino] Webhook sent for order ${id}`);
      }
    } catch (err) {
      console.error(`[Medusa→Magazzino] Error sending webhook for order ${id}:`, err.message);
    }
  }
}

module.exports = OrderPlacedSubscriber;
