const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GMAIL_USER = process.env.GMAIL_USER || 'socialhhz@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || '';
const STORE_NAME = process.env.STORE_NAME || 'HHZ Premium Store';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

function buildOrderItemsHtml(items) {
  return items.map(function(i) {
    var sz = i.size ? ' (EU ' + i.size + ')' : '';
    var sp = i.spec ? ' — ' + i.spec : '';
    return '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + escapeHtml(i.name) + sz + sp + '</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">' + i.qty + '</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">€' + (i.price * i.qty).toFixed(2) + '</td></tr>';
  }).join('');
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function baseHtml(content) {
  return '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e0e0e0">' +
    '<div style="background:linear-gradient(135deg,#d4a017,#b8860b);padding:24px;text-align:center">' +
    '<h1 style="color:#fff;margin:0;font-size:22px">HHZ Premium Store</h1>' +
    '<p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px">Premium Shoes & Colognes</p></div>' +
    '<div style="padding:24px">' + content + '</div>' +
    '<div style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#888">' +
    '<p style="margin:4px 0">© HHZ Premium Store — <a href="https://hhz-store.github.io/hhz-store" style="color:#d4a017">Visit our store</a></p>' +
    '<p style="margin:4px 0">Questions? Message us on WhatsApp: +32 488 225 144</p></div></div>';
}

app.post('/api/send-order-confirmation', function(req, res) {
  var order = req.body;
  if (!order || !order.id || !order.shippingInfo || !order.shippingInfo.email) {
    return res.status(400).json({ error: 'Missing order data or email' });
  }
  var email = order.shippingInfo.email;
  var itemsHtml = buildOrderItemsHtml(order.items || []);
  var content = '<h2 style="color:#333;margin-top:0">Order Confirmed 🎉</h2>' +
    '<p style="color:#555">Hi ' + escapeHtml(order.shippingInfo.name) + ',</p>' +
    '<p style="color:#555">Your order has been placed successfully! Here is your order summary:</p>' +
    '<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0">' +
    '<p style="margin:0 0 8px;font-size:14px"><strong>Order ID:</strong> ' + escapeHtml(order.id) + '</p>' +
    '<p style="margin:0 0 8px;font-size:14px"><strong>Status:</strong> ' + escapeHtml(order.status || 'Pending') + '</p>' +
    '<p style="margin:0;font-size:14px"><strong>Date:</strong> ' + new Date(order.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) + '</p></div>' +
    '<table style="width:100%;border-collapse:collapse;margin:16px 0">' +
    '<thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left;font-size:13px">Item</th><th style="padding:8px;text-align:center;font-size:13px">Qty</th><th style="padding:8px;text-align:right;font-size:13px">Price</th></tr></thead>' +
    '<tbody>' + itemsHtml + '</tbody>' +
    '<tfoot><tr><td colspan="2" style="padding:8px;text-align:right;font-weight:700;font-size:15px">Total</td><td style="padding:8px;text-align:right;font-weight:700;font-size:15px;color:#d4a017">€' + (order.total || 0).toFixed(2) + '</td></tr></tfoot></table>' +
    '<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0">' +
    '<h3 style="margin:0 0 8px;font-size:14px;color:#333">📦 Shipping to</h3>' +
    '<p style="margin:0;font-size:13px;color:#555">' + escapeHtml(order.shippingInfo.name) + '<br>' +
    escapeHtml(order.shippingInfo.address) + '<br>' +
    (order.shippingInfo.district ? escapeHtml(order.shippingInfo.district) + '<br>' : '') +
    escapeHtml(order.shippingInfo.city) + ', ' + escapeHtml(order.shippingInfo.state) + '<br>' +
    escapeHtml(order.shippingInfo.country) + ' ' + escapeHtml(order.shippingInfo.postcode) + '</p></div>' +
    '<div style="background:#fff8e1;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #d4a017">' +
    '<p style="margin:0;font-size:13px;color:#856404">💡 <strong>Note:</strong> Your order is being processed. We will notify you once payment is confirmed and when your package ships. Prices are negotiable — contact us on WhatsApp for the best deal.</p></div>';
  var mail = {
    from: '"' + STORE_NAME + '" <' + GMAIL_USER + '>',
    to: email,
    subject: '✅ Order Confirmed — ' + order.id,
    html: baseHtml(content)
  };
  transporter.sendMail(mail, function(err, info) {
    if (err) {
      console.error('Send error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    res.json({ success: true, messageId: info.messageId });
  });
});

app.post('/api/send-payment-confirmation', function(req, res) {
  var order = req.body;
  if (!order || !order.id || !order.shippingInfo || !order.shippingInfo.email) {
    return res.status(400).json({ error: 'Missing order data or email' });
  }
  var email = order.shippingInfo.email;
  var itemsHtml = buildOrderItemsHtml(order.items || []);
  var content = '<h2 style="color:#333;margin-top:0">Payment Confirmed 💳✅</h2>' +
    '<p style="color:#555">Hi ' + escapeHtml(order.shippingInfo.name) + ',</p>' +
    '<p style="color:#555">Great news! Your payment for order <strong>' + escapeHtml(order.id) + '</strong> has been confirmed.</p>' +
    '<div style="background:#e8f5e9;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #2e7d32">' +
    '<p style="margin:0;font-size:14px;color:#2e7d32">✅ <strong>Your payment has been received.</strong></p>' +
    '<p style="margin:8px 0 0;font-size:13px;color:#555">We will now process and ship your order within 1-3 business days. You will receive tracking information once your package is on its way.</p></div>' +
    '<table style="width:100%;border-collapse:collapse;margin:16px 0">' +
    '<thead><tr style="background:#f8f8f8"><th style="padding:8px;text-align:left;font-size:13px">Item</th><th style="padding:8px;text-align:center;font-size:13px">Qty</th><th style="padding:8px;text-align:right;font-size:13px">Price</th></tr></thead>' +
    '<tbody>' + itemsHtml + '</tbody>' +
    '<tfoot><tr><td colspan="2" style="padding:8px;text-align:right;font-weight:700;font-size:15px">Total Paid</td><td style="padding:8px;text-align:right;font-weight:700;font-size:15px;color:#2e7d32">€' + (order.total || 0).toFixed(2) + '</td></tr></tfoot></table>';
  var mail = {
    from: '"' + STORE_NAME + '" <' + GMAIL_USER + '>',
    to: email,
    subject: '💳 Payment Confirmed — ' + order.id,
    html: baseHtml(content)
  };
  transporter.sendMail(mail, function(err, info) {
    if (err) {
      console.error('Send error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    res.json({ success: true, messageId: info.messageId });
  });
});

app.post('/api/send-tracking', function(req, res) {
  var data = req.body;
  if (!data || !data.orderId || !data.email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  var content = '<h2 style="color:#333;margin-top:0">Your Package Has Shipped 📦🚚</h2>' +
    '<p style="color:#555">Hi ' + escapeHtml(data.name) + ',</p>' +
    '<p style="color:#555">Your order <strong>' + escapeHtml(data.orderId) + '</strong> is on its way!</p>' +
    '<div style="background:#e3f2fd;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #1565c0">' +
    '<p style="margin:0;font-size:14px;color:#1565c0">📮 <strong>Tracking Number:</strong> ' + escapeHtml(data.trackingNumber) + '</p>';
  if (data.trackingUrl) {
    content += '<p style="margin:8px 0 0"><a href="' + escapeHtml(data.trackingUrl) + '" target="_blank" style="display:inline-block;background:#1565c0;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">📦 Track Your Package</a></p>';
  }
  content += '</div><p style="color:#555;font-size:13px">Delivery usually takes 8-15 business days depending on your location. If you have any questions, feel free to reach out to us on WhatsApp.</p>';
  var mail = {
    from: '"' + STORE_NAME + '" <' + GMAIL_USER + '>',
    to: data.email,
    subject: '📦 Your HHZ Order Has Shipped — ' + data.orderId,
    html: baseHtml(content)
  };
  transporter.sendMail(mail, function(err, info) {
    if (err) {
      console.error('Send error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    res.json({ success: true, messageId: info.messageId });
  });
});

app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', app: 'HHZ Email Server' });
});

var PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('HHZ Email Server running on port ' + PORT);
});
