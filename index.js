const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, InteractionType } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ROLE_REQUIRED_ID = '1381291659492458549';
const WELCOME_CHANNEL_ID = '1381278996645412984';
const WELCOME_ROLES = ['1381290464916930691', '1381289341279670342'];
const ADMIN_PANEL_CHANNEL_ID = 'DEIN_ADMIN_CHANNEL_ID_HIER'; // <-- Hier Admin Channel ID eintragen

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const app = express();
const port = process.env.PORT || 3000;

// Mini-Webserver (nur damit Render zufrieden ist)
app.get('/', (req, res) => {
  res.send('Bot läuft!');
});
app.listen(port, () => {
  console.log(`🌐 Webserver läuft auf Port ${port}`);
});

// Verfügbare Dienste mit Status (true = sichtbar, false = versteckt)
let services = {
  'Netflix': { price: '1€', visible: true },
  'Spotify Single Account': { price: '1,50€', visible: true },
  'Spotify Family Account': { price: '5€', visible: true },
  'Disney+': { price: '0,70€', visible: true },
  'DAZN Radom': { price: '0,30€', visible: true },
  // ... weitere Dienste hier ergänzen
};

// Slash-Commands registrieren
const commands = [
  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Sende eine Embed-Nachricht')
    .addStringOption(option =>
      option.setName('titel')
        .setDescription('Titel des Embeds')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('nachricht')
        .setDescription('Inhalt des Embeds')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('farbe')
        .setDescription('Farbe des Embeds')
        .addChoices(
          { name: 'Rot', value: 'rot' },
          { name: 'Blau', value: 'blau' },
          { name: 'Grün', value: 'gruen' },
          { name: 'Gelb', value: 'gelb' },
          { name: 'Schwarz', value: 'schwarz' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Öffne den Shop'),

  new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Öffne das Admin Panel'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📨 Slash-Commands werden registriert...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash-Commands erfolgreich registriert!');
  } catch (err) {
    console.error(err);
  }
})();

// Willkommensnachricht
client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Welcome')
    .setColor('Red')
    .setDescription(`Hello ${member}.\nWelcome to **${member.guild.name}**.\nYou are the **${member.guild.memberCount}th** member!\nPlease verify to access all channels.`);

  await channel.send({ embeds: [embed] });

  try {
    await member.roles.add(WELCOME_ROLES);
  } catch (err) {
    console.error('Fehler beim Rollen geben:', err);
  }
});

// Hilfsfunktion: Erstelle Service-Options für Dropdown basierend auf Sichtbarkeit
function createServiceOptions() {
  return Object.entries(services)
    .filter(([name, data]) => data.visible)
    .map(([name, data]) => ({
      label: name,
      description: `Preis: ${data.price}`,
      value: name,
    }));
}

client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand && interaction.type !== InteractionType.MessageComponent) return;

  // Slash-Commands
  if (interaction.isChatInputCommand()) {
    const member = interaction.member;

    // /embed Command (nur mit Rolle)
    if (interaction.commandName === 'embed') {
      if (!member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }
      const titel = interaction.options.getString('titel');
      const nachricht = interaction.options.getString('nachricht');
      const farbe = interaction.options.getString('farbe');

      const farbMap = {
        rot: 0xFF0000,
        blau: 0x00AEFF,
        gruen: 0x00FF00,
        gelb: 0xFFFF00,
        schwarz: 0x2C2F33
      };

      const embed = new EmbedBuilder()
        .setTitle(titel)
        .setDescription(nachricht)
        .setColor(farbMap[farbe] || 0x00AEFF)
        .setFooter({ text: ' ' });

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // /shop Command (nur mit Rolle zum senden, aber Button klickbar für alle)
    else if (interaction.commandName === 'shop') {
      if (!member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }

      const options = createServiceOptions();

      if (options.length === 0) {
        return interaction.reply({ content: '🚫 Im Moment sind keine Dienste im Shop verfügbar.', ephemeral: true });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select')
        .setPlaceholder('Wähle einen Dienst aus')
        .addOptions(options);

      const buyButton = new ButtonBuilder()
        .setCustomId('buy_button')
        .setLabel('Kaufen')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(buyButton);

      await interaction.reply({
        content: 'Willkommen im Shop! Wähle unten deinen Dienst aus und klicke auf Kaufen.',
        components: [row, row2],
        ephemeral: false
      });
    }

    // /adminpanel Command (nur mit Rolle)
    else if (interaction.commandName === 'adminpanel') {
      if (!member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }

      const adminChannel = client.channels.cache.get(ADMIN_PANEL_CHANNEL_ID);
      if (!adminChannel) {
        return interaction.reply({ content: '❌ Admin-Channel nicht gefunden.', ephemeral: true });
      }

      // Erstelle Embed mit Service-Status
      let description = '';
      for (const [name, data] of Object.entries(services)) {
        description += `${data.visible ? '✅' : '❌'} **${name}** — Preis: ${data.price}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('Admin Panel: Dienste Verwaltung')
        .setDescription(description)
        .setColor('Blue')
        .setFooter({ text: 'Klicke auf einen Button, um den Dienst an- oder auszuschalten.' });

      // Buttons für jeden Dienst
      const buttons = new ActionRowBuilder();
      for (const [name, data] of Object.entries(services)) {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`toggle_${name}`)
            .setLabel(`${data.visible ? 'Ausblenden' : 'Einblenden'}: ${name}`)
            .setStyle(data.visible ? ButtonStyle.Danger : ButtonStyle.Success)
        );
      }

      // Sende oder editiere Nachricht im Admin Channel
      const fetchedMessages = await adminChannel.messages.fetch({ limit: 10 });
      const adminMessage = fetchedMessages.find(msg => msg.author.id === client.user.id && msg.embeds.length > 0 && msg.embeds[0].title === 'Admin Panel: Dienste Verwaltung');

      if (adminMessage) {
        await adminMessage.edit({ embeds: [embed], components: [buttons] });
        await interaction.reply({ content: '✅ Admin-Panel wurde aktualisiert.', ephemeral: true });
      } else {
       

client.login(TOKEN);
