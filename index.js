const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// IDs (bitte anpassen!)
const ROLE_REQUIRED_ID = '1381291659492458549'; // Rolle für Berechtigung
const WELCOME_CHANNEL_ID = '1381278996645412984';
const WELCOME_ROLES = ['1381290464916930691', '1381289341279670342'];
const ADMIN_PANEL_CHANNEL_ID = '1381286179152068750'; // Channel für Adminpanel

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const app = express();
const port = process.env.PORT || 3000;

// Mini-Webserver (damit Render & Co zufrieden sind)
app.get('/', (req, res) => {
  res.send('Bot läuft!');
});
app.listen(port, () => {
  console.log(`🌐 Webserver läuft auf Port ${port}`);
});

// Dienste mit Preis und Sichtbarkeit (Admin kann sichtbar/unsichtbar machen)
const services = {
  Netflix: { price: '5€', visible: true },
  Spotify: { price: '3€', visible: true },
  'Disney+': { price: '4€', visible: true },
  GTA: { price: '7€', visible: true },
  // Weitere Dienste hier hinzufügen
};

// Slash-Commands definieren
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
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Zeigt den Shop an (Button und Auswahl)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Öffnet das Admin-Panel zur Dienst-Verwaltung')
    .toJSON(),
];

// Slash-Commands registrieren
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

// Willkommensnachricht mit Rollenvergabe
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

// Interaction Handler (Commands, SelectMenus, Buttons)
client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    // /embed Command (nur mit Rolle)
    if (interaction.commandName === 'embed') {
      if (!interaction.member.roles.cache.has(ROLE_REQUIRED_ID)) {
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

    // /shop Command (nur mit Rolle ausführbar)
    else if (interaction.commandName === 'shop') {
      if (!interaction.member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }

      // Dropdown-Menü mit nur sichtbaren Diensten
      const options = Object.entries(services)
        .filter(([_, data]) => data.visible)
        .map(([name, data]) => ({
          label: name,
          description: `Preis: ${data.price}`,
          value: name,
        }));

      if (options.length === 0) {
        return interaction.reply({ content: 'Der Shop ist aktuell leer.', ephemeral: true });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select')
        .setPlaceholder('Wähle einen Dienst aus')
        .addOptions(options);

      const buyButton = new ButtonBuilder()
        .setCustomId('buy_button')
        .setLabel('Kaufen')
        .setStyle(ButtonStyle.Success);

      const rowSelect = new ActionRowBuilder().addComponents(selectMenu);
      const rowButton = new ActionRowBuilder().addComponents(buyButton);

      await interaction.reply({
        content: 'Willkommen im Shop! Wähle einen Dienst aus und klicke auf "Kaufen".',
        components: [rowSelect, rowButton],
        ephemeral: false
      });
    }

    // /adminpanel Command (nur mit Rolle)
    else if (interaction.commandName === 'adminpanel') {
      if (!interaction.member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }

      const adminChannel = client.channels.cache.get(ADMIN_PANEL_CHANNEL_ID);
      if (!adminChannel) {
        return interaction.reply({ content: '❌ Admin-Channel nicht gefunden.', ephemeral: true });
      }

      // Erstelle Embed mit Dienststatus
      let description = '';
      for (const [name, data] of Object.entries(services)) {
        description += `${data.visible ? '✅' : '❌'} **${name}** — Preis: ${data.price}\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('Admin Panel: Dienste Verwaltung')
        .setDescription(description)
        .setColor('Blue')
        .setFooter({ text: 'Klicke auf die Buttons, um Dienste ein-/auszuschalten.' });

      const buttonsRow = new ActionRowBuilder();
      for (const [name, data] of Object.entries(services)) {
        buttonsRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`toggle_${name}`)
            .setLabel(data.visible ? `Ausblenden: ${name}` : `Einblenden: ${name}`)
            .setStyle(data.visible ? ButtonStyle.Danger : ButtonStyle.Success)
        );
      }

      // Suche Nachricht im Admin Channel, sonst sende neue
      const fetchedMessages = await adminChannel.messages.fetch({ limit: 10 });
      const adminMessage = fetchedMessages.find(msg => msg.author.id === client.user.id && msg.embeds.length > 0 && msg.embeds[0].title === 'Admin Panel: Dienste Verwaltung');

      if (adminMessage) {
        await adminMessage.edit({ embeds: [embed], components: [buttonsRow] });
        await interaction.reply({ content: '✅ Admin-Panel wurde aktualisiert.', ephemeral: true });
      } else {
        await adminChannel.send({ embeds: [embed], components: [buttonsRow] });
        await interaction.reply({ content: '✅ Admin-Panel wurde erstellt.', ephemeral: true });
      }
    }
  }

  // SelectMenu Interaktion im Shop
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'shop_select') {
      const selected = interaction.values[0];
      await interaction.reply({ content: `Du hast den Dienst **${selected}** ausgewählt. Drücke nun "Kaufen".`, ephemeral: true });
    }
  }

  // Button Interaktionen (Shop Kaufen & Admin Toggle)
  else if (interaction.isButton()) {
    // Kauf-Button (jeder darf klicken)
    if (interaction.customId === 'buy_button') {
      await interaction.reply({ content:
