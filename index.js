const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ROLE_REQUIRED_ID = '1381291659492458549'; // Rolle, die Command benutzen darf
const WELCOME_CHANNEL_ID = '1381278996645412984';
const WELCOME_ROLES = ['1381290464916930691', '1381289341279670342'];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const app = express();
const port = process.env.PORT || 3000;

// Einfacher Webserver, damit Render zufrieden ist
app.get('/', (req, res) => {
  res.send('Bot läuft!');
});
app.listen(port, () => {
  console.log(`🌐 Webserver läuft auf Port ${port}`);
});

// Slash-Command definieren
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
    .toJSON()
];

// Slash-Command registrieren
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📨 Slash-Command wird registriert...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash-Command erfolgreich registriert!');
  } catch (err) {
    console.error(err);
  }
})();

// Willkommen und Rollen vergeben
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

// Bot ready
client.on('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

// Embed Command ohne Anzeige des Autors
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'embed') {
    const member = interaction.member;
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
      .setFooter({ text: ' ' }); // Footer leer, Autor wird nicht angezeigt

    // Antwort nur für den Nutzer (versteckt)
    await interaction.reply({ content: '✅ Embed wurde gesendet.', ephemeral: true });

    // Embed im Kanal senden, ohne Verknüpfung mit dem Command (kein Autor sichtbar)
    await interaction.channel.send({ embeds: [embed] });
  }
});

client.login(TOKEN);
