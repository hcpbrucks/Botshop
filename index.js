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
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ROLE_REQUIRED_ID = '1381291659492458549';
const WELCOME_CHANNEL_ID = '1381278996645412984';
const WELCOME_ROLES = ['1381290464916930691', '1381289341279670342'];
const ADMIN_PANEL_CHANNEL_ID = '1381286179152068750';

const services = {
  Netflix: { price: '10€', visible: true },
  Spotify: { price: '8€', visible: true },
  DisneyPlus: { price: '9€', visible: true },
  GTA: { price: '15€', visible: true },
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot läuft!');
});
app.listen(port, () => {
  console.log(`🌐 Webserver läuft auf Port ${port}`);
});

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
    .setDescription('Zeigt den Shop an')
    .setDefaultMemberPermissions(0)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('adminpanel')
    .setDescription('Admin-Panel für Dienste verwalten')
    .setDefaultMemberPermissions(0)
    .toJSON(),
];

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

function getVisibleServicesOptions() {
  return Object.entries(services)
    .filter(([_, data]) => data.visible)
    .map(([name, data]) => ({
      label: name,
      description: `Preis: ${data.price}`,
      value: name,
    }));
}

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

const userSelections = new Map();

client.on('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const member = interaction.member;

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

      return interaction.reply({ embeds: [embed], ephemeral: false });
    } 
    else if (interaction.commandName === 'shop') {
      if (!member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }

      const options = getVisibleServicesOptions();
      if (options.length === 0) {
        return interaction.reply({ content: 'Der Shop ist momentan leer.', ephemeral: true });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_select')
        .setPlaceholder('Wähle einen Dienst aus')
        .addOptions(options);

      const buyButton = new ButtonBuilder()
        .setCustomId('buy_button')
        .setLabel('Kaufen')
        .setStyle(ButtonStyle.Primary);

      const row1 = new ActionRowBuilder().addComponents(selectMenu);
      const row2 = new ActionRowBuilder().addComponents(buyButton);

      await interaction.reply({
        content: 'Wähle im Dropdown einen Dienst aus und drücke auf Kaufen.',
        components: [row1, row2],
        ephemeral: false
      });
    } 
    else if (interaction.commandName === 'adminpanel') {
      if (!member.roles.cache.has(ROLE_REQUIRED_ID)) {
        return interaction.reply({ content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.', ephemeral: true });
      }

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

      await interaction.reply({ embeds: [embed], components: [buttonsRow], ephemeral: true });
    }
  } 
  else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'shop_select') {
      const selected = interaction.values[0];
      userSelections.set(interaction.user.id, selected);
      await interaction.reply({ content: `Du hast den Dienst **${selected}** ausgewählt. Drücke nun "Kaufen".`, ephemeral: true });
    }
  } 
  else if (interaction.isButton()) {
    if (interaction.customId === 'buy_button') {
      const selectedService = userSelections.get(interaction.user.id);
      if (!selectedService) {
        return interaction.reply({ content: '❌ Du hast keinen Dienst ausgewählt. Bitte wähle zuerst einen Dienst im Dropdown aus.', ephemeral: true });
      }

      const service = services[selectedService];
      if (!service || !service.visible) {
        return interaction.reply({ content: '❌ Dieser Dienst ist aktuell nicht verfügbar.', ephemeral: true });
      }

      await interaction.reply({ content: `✅ Du hast den Dienst **${selectedService}** für **${service.price}** gekauft! (Simulierte Zahlung)`, ephemeral: true });

            // Hier kannst du deine Logik für den Kauf, Rollenvergabe etc. einbauen.
      // Beispiel: Nachricht im Admin-Channel mit Bestellübersicht senden
      const adminChannel = client.channels.cache.get(ADMIN_PANEL_CHANNEL_ID);
      if (adminChannel) {
        const embed = new EmbedBuilder()
          .setTitle('Neuer Kauf')
          .setColor(0x00AEFF)
          .setDescription(`**User:** ${interaction.user.tag}\n**Dienst:** ${selectedService}\n**Preis:** ${service.price}\n**Datum:** <t:${Math.floor(Date.now() / 1000)}:F>`);
        adminChannel.send({ embeds: [embed] });
      }

      // Optional: Rolle vergeben, wenn gewünscht
      // const role = interaction.guild.roles.cache.get('ROLE_ID_HIER');
      // if(role) {
      //   interaction.member.roles.add(role).catch(console.error);
      // }

      // Auswahl zurücksetzen, damit man nochmal neu auswählen kann
      userSelections.delete(interaction.user.id);
    } 
    else if (interaction.customId.startsWith('toggle_')) {
      // Admin-Panel: Dienste Ein-/Ausblenden
      const dienstName = interaction.customId.replace('toggle_', '');
      if (!(dienstName in services)) {
        return interaction.reply({ content: 'Unbekannter Dienst.', ephemeral: true });
      }

      services[dienstName].visible = !services[dienstName].visible;

      // Embed aktualisieren
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

      await interaction.update({ embeds: [embed], components: [buttonsRow] });
    }
  }
});

client.login(TOKEN);
