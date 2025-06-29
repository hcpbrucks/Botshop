require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const prices = ['1', '5', '8', '10', '15', '20'];
const sessions = new Map();

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  client.application.commands.set([
    { name: 'kauf-menü', description: 'Starte den Bot-Kauf' }
  ], process.env.GUILD_ID);
});

client.on(Events.InteractionCreate, async inter => {
  if (inter.isChatInputCommand() && inter.commandName === 'kauf-menü') {
    const embed = new EmbedBuilder()
      .setTitle('Kaufe deinen personalisierten Bot')
      .setDescription(`💰 Preise: ${prices.join('€ • ')}€\nZahlung: PayPal, PSC, Amazon, Robux, Überweisung`)
      .setColor(0x00AE86);
    const button = new ButtonBuilder()
      .setCustomId('kauf_start')
      .setLabel('Jetzt starten')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Success);
    await inter.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  }

  if (inter.isButton() && inter.customId === 'kauf_start') {
    sessions.set(inter.user.id, { step: 1, data: { userId: inter.user.id } });
    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_price')
      .setPlaceholder('Wähle deinen Preis')
      .addOptions(prices.map(p => ({ label: `${p}€`, value: p })));
    await inter.update({ content: 'Wähle deinen Preis:', embeds: [], components: [new ActionRowBuilder().addComponents(menu)] });
  }

  if (inter.isStringSelectMenu() && inter.customId === 'select_price') {
    const session = sessions.get(inter.user.id);
    if (!session) return inter.reply({ content: '❌ Session abgelaufen.', ephemeral: true });

    const price = inter.values[0];
    session.data.price = price;

    const count = { '1': 3, '5': 3, '8': 5, '10': 5, '15': 5, '20': 5 }[price];
    const modal = new ModalBuilder().setCustomId('form1').setTitle(`Angaben für ${price}€`);

    for (let i = 0; i < count; i++) {
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`field_${i}`)
          .setLabel(`Befehl/Automation ${i + 1}`)
          .setStyle(TextInputStyle.Short)
      ));
    }

    await inter.showModal(modal);
  }

  if (inter.isModalSubmit() && inter.customId === 'form1') {
    const session = sessions.get(inter.user.id);
    if (!session) return inter.reply({ content: 'Session abgelaufen.', ephemeral: true });

    const fields = [];
    for (let i = 0; i < 10; i++) {
      try {
        fields.push(inter.fields.getTextInputValue(`field_${i}`));
      } catch {}
    }

    session.data.fields = fields.filter(f => f.trim() !== '');
    const { userId, price } = session.data;
    await inter.reply({ content: `✅ Danke <@${userId}>! Wir melden uns bald bei dir.`, ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('📩 Neue Bestellung')
      .addFields(
        { name: 'User', value: `<@${userId}>`, inline: true },
        { name: 'Preis', value: `${price}€`, inline: true },
        { name: 'Befehle', value: session.data.fields.map((f, i) => `${i + 1}. ${f}`).join('\n') }
      )
      .setColor(0xffcc00);
    const adminChan = await client.channels.fetch(process.env.ADMIN_CHANNEL_ID);
    await adminChan.send({ embeds: [embed] });

    sessions.delete(userId);
  }
});

client.login(process.env.TOKEN);
