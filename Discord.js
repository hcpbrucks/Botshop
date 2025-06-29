const { Client, GatewayIntentBits, Partials, Events,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// === CONFIG ===
const TOKEN = 'MTM4ODkxNTIyNzE1NTc2MzM2Mg.GJSXC9.6zdo8RpNr1mZ6QeAD7Vf2bBmSd7zA-ZRcXoAYQ';
const GUILD_ID = '1381009607123796069';
const ADMIN_CHANNEL_ID = '1381598178540781578';
const ROLE_PAID = '1381289636952932352';

// Preisoptionen
const prices = ['1', '5','8','10','15','20'];

// Temporäre Speicherstruktur
const sessions = new Map();

// === Bot ready ===
client.once(Events.ClientReady, () => console.log(`Bot ${client.user.tag} online!`));

// === Slash-Command-Handler ===
client.on(Events.InteractionCreate, async inter => {
  if (inter.isChatInputCommand() && inter.commandName === 'kauf-menü') {
    const embed = new EmbedBuilder()
      .setColor(0x3498db).setTitle('Kaufe jetzt Deinen personalisierten Bot ab 1€')
      .setDescription(
`Du möchtest deinen eigenen personalisierten Bot mit allen Funktionen...  
💰 Preise: ${prices.map(p=>`${p}€`).join(' • ')}  
💳 Zahlungsmöglichkeiten: PayPal•Paysafe•Amazon•Robux•Banküberweisung•Boost`
      );
    const btn = new ButtonBuilder()
      .setCustomId('kauf_start')
      .setLabel('Jetzt personalisieren')
      .setEmoji('🚨')
      .setStyle(ButtonStyle.Success);
    await inter.reply({ embeds:[embed], components:[new ActionRowBuilder().addComponents(btn)] });
  }
});

// === Button-Handler ===
client.on(Events.InteractionCreate, async inter => {
  if (!inter.isButton()) return;
  const { customId, user, channel } = inter;
  if (customId==='kauf_start') {
    sessions.set(user.id, { step:1, data:{ userId:user.id } });
    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_price')
      .setPlaceholder('Wähle deinen Preis')
      .addOptions(prices.map(p=>({label:`${p}€`, value:p})));
    await inter.update({ content:'Wähle deinen Preis:', embeds:[], components:[new ActionRowBuilder().addComponents(menu)] });
  }
});

// === Select-Handler ===
client.on(Events.InteractionCreate, async inter => {
  if (!inter.isStringSelectMenu() || inter.customId !== 'select_price') return;
  const userId = inter.user.id;
  const price = inter.values[0];
  const session = sessions.get(userId);
  if (!session) return inter.reply({ content:'Session abgelaufen.', ephemeral:true });
  session.data.price = price;
  session.step = 2;

  // Zahl der Felder je Preisstufe
  const fields = { '1':3,'5':3,'8':5,'10':5,'15':5,'20':5 }[price];
  // Erster Modal mit N Feldern
  const modal = new ModalBuilder().setCustomId('form1').setTitle(`Erste Schritte (${price}€)`);

  for(let i=0;i<fields;i++){
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`field1_${i}`)
          .setLabel(`Befehl/Automation ${i+1}`)
          .setStyle(TextInputStyle.Short)
      )
    );
  }

  await inter.showModal(modal);
});

// === Modal submission ===
client.on(Events.InteractionCreate, async inter => {
  if (!inter.isModalSubmit()) return;
  const { customId, user} = inter;
  const session = sessions.get(user.id);
  if (!session) return inter.reply({ content:'Session abgelaufen.', ephemeral:true });

  if (customId === 'form1') {
    const price = session.data.price;
    // save first inputs
    const count1 = { '1':3,'5':3,'8':5,'10':5,'15':5,'20':5 }[price];
    session.data.fields = [];
    for(let i=0; i<count1; i++){
      session.data.fields.push(inter.fields.getTextInputValue(`field1_${i}`));
    }

    if (price==='15'||price==='20'){
      session.step =3;
      const modal2 = new ModalBuilder().setCustomId('form2').setTitle(`Weitere Befehle (${price}€)`);
      for(let j=0;j<10;j++){
        modal2.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`field2_${j}`)
              .setLabel(`Befehl/Automation ${count1+j+1}`)
              .setStyle(TextInputStyle.Short)
          )
        );
      }
      return inter.showModal(modal2);
    } else {
      session.step = 4;
      // direkt weiter
      return handleFinal(inter, session);
    }
  }

  if (customId === 'form2'){
    session.data.fields.push(...Array.from({length:10}, (_,j)=>inter.fields.getTextInputValue(`field2_${j}`)));
    if (session.data.price === '20'){
      session.step = 4;
      return handleFinal(inter, session);
    }
    if (session.data.price==='15'){
      session.step = 4;
      return handleFinal(inter, session);
    }
  }
});

// === Final step ===
async function handleFinal(inter, session) {
  const { userId, price, fields } = session.data;
  const user = await client.users.fetch(userId);
  await inter.reply({ content:`Danke <@${userId}>! Du hast ${fields.length} Befehle angegeben. Wir melden uns gleich.`, ephemeral:true });

  const adminChan = await client.channels.fetch(ADMIN_CHANNEL_ID);
  const embed = new EmbedBuilder()
    .setTitle('Neue Bot-Bestellung')
    .addFields(
      { name:'Kunde', value:`<@${userId}>`, inline:true },
      { name:'Preis', value:`${price}€`, inline:true },
      { name:'Befehle', value:fields.map((f,i)=>`${i+1}. ${f}`).join('\n') }
    );
  await adminChan.send({ embeds:[embed] });

  // Aufräumen
  sessions.delete(userId);
}

// === Register Slash Command ===
client.on(Events.ClientReady, async () => {
  const data = [{ name:'kauf-menü', description:'Starte den Kauf eines Bots' }];
  await client.application.commands.set(data, GUILD_ID);
});

client.login(TOKEN);
