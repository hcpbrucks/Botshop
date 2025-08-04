// Imports & Setup
const express = require('express');
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// IDs und Rollen
const ROLE_REQUIRED_ID = '1381291659492458549'; // Rolle für Adminbefehle
const ADMIN_PANEL_CHANNEL_ID = 'DEIN_ADMIN_CHANNEL_ID'; // Channel für Admin Logs

// Dienste mit Preisen und Sichtbarkeit
const services = {
  Netflix: { price: '5€', visible: true },
  Spotify: { price: '3€', visible: true },
  'Disney+': { price: '4€', visible: true },
  GTA: { price: '7€', visible: true },
  Crunchyroll: { price: '2€', visible: true },
  'YouTube Premium': { price: '3€', visible: true },
  DAZN: { price: '6€', visible: true },
  NordVPN: { price: '5€', visible: true },
  'Prime Video': { price: '4€', visible: true },
  'CapCut Pro': { price: '3€', visible: true },
  'ChatGPT Plus': { price: '10€', visible: true },
  Steam: { price: '8€', visible: true },
  'Adobe Creative Cloud': { price: '9€', visible: true },
  'Canva Premium': { price: '3€', visible: true },
  'Paramount+': { price: '4€', visible: true },
};

// Express Webserver (für Hosting Plattformen)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('Bot läuft!');
});
app.listen(port, () => {
  console.log(`🌐 Webserver läuft auf Port ${port}`);
});

// Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Slash Commands Definition
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
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Öffnet das Shop-Menü')
    .setDefaultMemberPermissions(PermissionFlagsBits.None) // Manuelle Rolle Check
    .toJSON(),

  new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Öffnet das Admin-Panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.None) // Nur für Role-Holder
    .toJSON(),
];

// Slash Commands registrieren
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📨 Slash-Commands werden registriert...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash-Commands erfolgreich registriert');
  } catch (error) {
    console.error('Fehler beim Registrieren der Commands:', error);
  }
})();

// Helper Funktion zum Prüfen der Rolle
function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

// Shop Embed + Buttons generieren (nur sichtbare Dienste)
function createShopEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🛒 Shop Übersicht')
    .setDescription('Wähle einen Dienst aus, um zu kaufen.')
    .setColor('#00FF00')
    .setTimestamp();

  for (const [name, data] of Object.entries(services)) {
    if (data.visible) {
      embed.addFields({ name: name, value: `Preis: ${data.price}`, inline: true });
    }
  }

  return embed;
}

function createShopButtons() {
  const row = new ActionRowBuilder();
  // Max 5 Buttons pro ActionRow erlaubt, wir machen mehrere Reihen falls nötig
  // Hier für Beispiel alle auf einer Reihe, man kann splitten falls zu viele
  let buttonsCount = 0;
  const rows = [];

  let currentRow = new ActionRowBuilder();
  for (const [name, data] of Object.entries(services)) {
    if (!data.visible) continue;

    if (buttonsCount === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonsCount = 0;
    }

    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`buy_${name}`)
        .setLabel(name)
        .setStyle(ButtonStyle.Primary)
    );
    buttonsCount++;
  }
  if (buttonsCount > 0) rows.push(currentRow);

  return rows;
}

// Admin Panel Embed + Toggle Buttons (für Sichtbarkeit)
function createAdminPanelEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('🛠 Admin Panel - Dienste Sichtbarkeit')
    .setDescription('Klicke auf Buttons, um Dienste sichtbar/unsichtbar zu machen.')
    .setColor('#FF0000')
    .setTimestamp();

  for (const [name, data] of Object.entries(services)) {
    embed.addFields({ name, value: `Sichtbar: ${data.visible ? '✅' : '❌'}`, inline: true });
  }

  return embed;
}

function createAdminPanelButtons() {
  const row = new ActionRowBuilder();
  let buttonsCount = 0;
  const rows = [];

  let currentRow = new ActionRowBuilder();
  for (const [name, data] of Object.entries(services)) {
    if (buttonsCount === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      buttonsCount = 0;
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`toggle_${name}`)
        .setLabel(`${data.visible ? 'Ausblenden' : 'Einblenden'} ${name}`)
        .setStyle(data.visible ? ButtonStyle.Danger : ButtonStyle.Success)
    );
    buttonsCount++;
  }
  if (buttonsCount > 0) rows.push(currentRow);

  return rows;
}

// Client Ready Event
client.once('ready', () => {
  console.log(`🚀 Bot ist online als ${client.user.tag}`);
});

// Interactions Event (Slash Commands + Buttons)
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName, member } = interaction;

    if (commandName === 'embed') {
      // Nur Leute mit ManageMessages dürfen den Embed senden
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'Du hast keine Berechtigung für diesen Befehl.', ephemeral: true });
      }
      const titel = interaction.options.getString('titel');
      const nachricht = interaction.options.getString('nachricht');
      const farbe = interaction.options.getString('farbe') || 'schwarz';

      const farbMapping = {
        rot: '#FF0000',
        blau: '#0000FF',
        gruen: '#00FF00',
        gelb: '#FFFF00',
        schwarz: '#000000',
      };

      const embed = new EmbedBuilder()
        .setTitle(titel)
        .setDescription(nachricht)
        .setColor(farbMapping[farbe] || '#000000');

      await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'shop') {
      // Nur Mitglieder mit Rolle dürfen den Command benutzen
      if (!hasRole(member, ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl zu benutzen.', ephemeral: true });
      }

      const embed = createShopEmbed();
      const buttons = createShopButtons();

      await interaction.reply({ embeds: [embed], components: buttons, ephemeral: false });
    }
    else if (commandName === 'adminpanel') {
      // Nur Mitglieder mit Rolle dürfen das Adminpanel öffnen
      if (!hasRole(member, ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: 'Du hast keine Berechtigung, diesen Befehl zu benutzen.', ephemeral: true });
      }

      const embed = createAdminPanelEmbed();
      const buttons = createAdminPanelButtons();

      await interaction.reply({ embeds: [embed], components: buttons, ephemeral: true });
    }
  }
  else if (interaction.isButton()) {
    const member = interaction.member;

    // Button CustomID kann starten mit buy_ oder toggle_
    const customId = interaction.customId;

    if (customId.startsWith('buy_')) {
      // JEDER darf Button drücken - wir lesen Dienstname aus
      const serviceName = customId.substring(4);

      if (!services[serviceName] || !services[serviceName].visible) {
        return interaction.reply({ content: 'Dieser Dienst ist aktuell nicht verfügbar.', ephemeral: true });
      }

      // Antwort mit Kaufinfo (hier einfach Beispiel)
      await interaction.reply({ content: `Du hast den Dienst **${serviceName}** für ${services[serviceName].price} ausgewählt. Bitte kontaktiere den Support für die Zahlung.`, ephemeral: true });
    }
    else if (customId.startsWith('toggle_')) {
      // Nur mit Rolle erlaubt
      if (!hasRole(member, ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: 'Du hast keine Berechtigung, diese Aktion auszuführen.', ephemeral: true });
      }

      const serviceName = customId.substring(7);

      if (!services[serviceName]) {
        return interaction.reply({ content: 'Dienst nicht gefunden.', ephemeral: true });
      }

      // Toggle Sichtbarkeit
      services[serviceName].visible = !services[serviceName].visible;

      // Update Admin Panel Nachricht (sofern möglich)
      // Leider keine Nachricht ID gespeichert, daher nur Feedback
      await interaction.update({
        embeds: [createAdminPanelEmbed()],
        components: createAdminPanelButtons()
      });
    }
  }
});

// Login
client.login(TOKEN);
