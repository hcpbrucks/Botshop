const express = require('express');
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot läuft!'));
app.listen(PORT, () => console.log(`🌐 Webserver läuft auf Port ${PORT}`));

// Discord Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const farben = {
  rot: 0xFF0000,
  blau: 0x0000FF,
  grün: 0x00FF00,
  schwarz: 0x000000,
  gelb: 0xFFFF00,
};

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
        .setDescription('Wähle die Farbe des Embeds')
        .addChoices(
          { name: 'Rot', value: 'rot' },
          { name: 'Blau', value: 'blau' },
          { name: 'Grün', value: 'grün' },
          { name: 'Schwarz', value: 'schwarz' },
          { name: 'Gelb', value: 'gelb' },
        )
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .toJSON()
];

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

client.on('ready', () => {
  console.log(`🤖 Bot ist online als ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'embed') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const allowedRole = '1381291659492458549';

    if (!member.roles.cache.has(allowedRole)) {
      return await interaction.reply({
        content: '❌ Du darfst diesen Befehl nicht benutzen.',
        ephemeral: true
      });
    }

    const titel = interaction.options.getString('titel');
    const nachricht = interaction.options.getString('nachricht');
    const farbe = interaction.options.getString('farbe');
    const farbwert = farben[farbe] ?? 0x00AEFF;

    const embed = new EmbedBuilder()
      .setTitle(titel)
      .setDescription(nachricht)
      .setColor(farbwert)
      

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Embed gesendet.', ephemeral: true });
  }
});

client.login(TOKEN);
