const express = require('express');
const paypal = require('paypal-rest-sdk');
const { Client, GatewayIntentBits } = require('discord.js');

// ⚙️ Konfiguration über Umgebungsvariablen
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
const BASE_URL = process.env.BASE_URL; // z. B. https://botshop-v6zi.onrender.com
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ]
});

const registeredUsers = new Map();

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

// === BEFEHL: !pay
client.on('messageCreate', async message => {
  if (message.author.bot || message.content.toLowerCase() !== '!pay') return;

  const channel = message.channel;
  const userId = message.author.id;

  if (!channel.name.startsWith('kauf-ticket-')) {
    const reply = await message.reply('❌ Dieser Befehl darf nur in einem Kauf-Ticket verwendet werden.');
    setTimeout(() => {
      message.delete().catch(() => {});
      reply.delete().catch(() => {});
    }, 10000);
    return;
  }

  const messages = await channel.messages.fetch({ limit: 10 });
  const last = messages.find(msg => msg.author.bot && /(\d+[.,]?\d*)€/.test(msg.content));
  if (!last) return message.reply('❌ Konnte keine Nachricht mit dem Preis finden.');

  const match = last.content.match(/(\d+[.,]?\d*)€/);
  if (!match) return message.reply('❌ Preis konnte nicht ausgelesen werden.');

  const price = match[1].replace(',', '.');
  registeredUsers.set(userId, price);

  message.reply(`✅ Du bist registriert! Bezahle hier:\n${BASE_URL}/pay?userId=${userId}`);
});

client.login(DISCORD_TOKEN);

// === PAYPAL Setup
paypal.configure({
  mode: 'sandbox', // oder 'live'
  client_id: PAYPAL_CLIENT_ID,
  client_secret: PAYPAL_CLIENT_SECRET
});

// === EXPRESS SERVER
app.get('/', (req, res) => {
  res.send('🟢 Bot & Server laufen');
});

app.get('/pay', (req, res) => {
  const userId = req.query.userId;
  const amount = registeredUsers.get(userId);

  if (!userId || !amount) {
    return res.send('❌ Du musst dich zuerst mit !pay registrieren.');
  }

  const create_payment_json = {
    intent: 'sale',
    payer: { payment_method: 'paypal' },
    redirect_urls: {
      return_url: `${BASE_URL}/success?userId=${userId}`,
      cancel_url: `${BASE_URL}/cancel`
    },
    transactions: [{
      amount: { currency: 'EUR', total: amount },
      description: 'Discord-Rolle kaufen'
    }]
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      console.error(error);
      return res.send('❌ Fehler beim Erstellen der Zahlung.');
    }

    const approvalUrl = payment.links.find(link => link.rel === 'approval_url');
    if (approvalUrl) return res.redirect(approvalUrl.href);
    return res.send('❌ Keine Weiterleitung möglich.');
  });
});

app.get('/success', async (req, res) => {
  const { PayerID: payerId, paymentId, userId } = req.query;
  const amount = registeredUsers.get(userId);

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [{
      amount: { currency: 'EUR', total: amount }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
    if (error) {
      console.error(error.response);
      return res.send('❌ Zahlung fehlgeschlagen.');
    }

    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      const member = await guild.members.fetch(userId);
      await member.roles.add(ROLE_ID);

      const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
      if (adminChannel && adminChannel.isTextBased()) {
        adminChannel.send(`✅ **Zahlung erhalten!**\nUser: <@${userId}>\nBetrag: ${amount} €`);
      }

      res.send('✅ Zahlung erfolgreich! Du hast deine Rolle erhalten.');
    } catch (err) {
      console.error('Fehler beim Rollen vergeben:', err);
      res.send('✅ Zahlung erfolgreich, aber es gab einen Fehler bei der Rollenzuweisung.');
    }
  });
});

app.get('/cancel', (req, res) => {
  res.send('❌ Zahlung wurde abgebrochen.');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Server läuft auf Port ${PORT}`);
});
