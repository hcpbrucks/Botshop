const { 
  Client, GatewayIntentBits, SlashCommandBuilder, 
  REST, Routes, EmbedBuilder, PermissionFlagsBits 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ERLAUBTE_ROLLE = '1381291659492458549';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 🎯 Slash-Command erstellen
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
          { name: 'Hellblau (Standard)', value: '0x00AEFF' },
          { name: 'Rot', value: '0xFF0000' },
          { name: 'Grün', value: '0x00FF00' },
          { name: 'Blau', value: '0x0000FF' },
          { name: 'Gelb', value: '0xFFFF00' },
          { name: 'Schwarz', value: '0x000000' }
        )
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
    .toJSON()
];

// 🛰️ Slash-Command registrieren
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

// 🤖 Bot bereit
client.on('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

// 📥 Befehl ausführen
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'embed') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ERLAUBTE_ROLLE)) {
      return await interaction.reply({
        content: '❌ Du hast keine Berechtigung, diesen Befehl zu verwenden.',
        ephemeral: true
      });
    }

    const titel = interaction.options.getString('titel');
    const nachricht = interaction.options.getString('nachricht');
    const farbwahl = interaction.options.getString('farbe');
    const farbe = farbwahl ? parseInt(farbwahl) : 0x00AEFF;

    const embed = new EmbedBuilder()
      .setTitle(titel)
      .setDescription(nachricht)
      .setColor(farbe)
      .setTimestamp()
      .setFooter({ text: `Gesendet von ${interaction.user.tag}` });

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Embed gesendet!', ephemeral: true });
  }
});

client.login(TOKEN);
