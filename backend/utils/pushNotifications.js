/**
 * Expo Push Notification Service
 * Sends push notifications to users via Expo's push service
 */

/**
 * Send a push notification to a user's device
 * @param {string} pushToken - Expo push token
 * @param {object} notification - { title, body, data }
 */
async function sendPushNotification(pushToken, { title, body, data = {} }) {
  if (!pushToken) {
    console.warn('No push token provided, skipping notification');
    return;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (result.data && result.data.status === 'error') {
      console.error('Push notification error:', result.data.message);
    } else {
      console.log('Push notification sent successfully');
    }
  } catch (error) {
    console.error('Failed to send push notification:', error.message);
  }
}

/**
 * Send order status update notification to customer
 */
async function sendOrderStatusNotification(user, orderId, newStatus) {
  const statusMessages = {
    placed: 'Your order has been placed!',
    confirmed: 'Your order has been confirmed.',
    preparing: 'Your order is being prepared.',
    out_for_delivery: 'Your order is out for delivery!',
    delivered: 'Your order has been delivered. Enjoy!',
    cancelled: 'Your order has been cancelled.'
  };

  const title = 'Mehran Order Update';
  const body = statusMessages[newStatus] || `Order #${orderId} status: ${newStatus}`;

  await sendPushNotification(user.pushToken, {
    title,
    body,
    data: { orderId, status: newStatus, type: 'order_update' }
  });
}

/**
 * Send new order alert to admin/staff
 */
async function sendNewOrderAlert(pushToken, orderId, totalAmount) {
  await sendPushNotification(pushToken, {
    title: 'New Order Received!',
    body: `Order #${orderId} - Rs. ${totalAmount}`,
    data: { orderId, type: 'new_order' }
  });
}

module.exports = {
  sendPushNotification,
  sendOrderStatusNotification,
  sendNewOrderAlert
};
