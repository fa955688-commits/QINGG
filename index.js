const http = require('http');
const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');

// 1. Render Keep-Alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("QINGG Bot is Awake!");
  res.end();
}).listen(process.env.PORT || 10000);

// 2. Database Connection
const mongoURI = process.env.MONGO_URI;
if (mongoURI) {
    mongoose.connect(mongoURI)
      .then(() => console.log('✅ Connected to MongoDB!'))
      .catch(err => console.error('❌ Database connection error:', err));
}

// Data Schema: আপনার আইডি এখানে ডিফল্ট মেম্বার হিসেবে আছে
const SettingsSchema = new mongoose.Schema({
  guildId: String,
  whitelist: { type: [String], default: ['1302551987031900173'] }, 
  antinuke: { type: Boolean, default: true }
});
const Settings = mongoose.model('Settings', SettingsSchema);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const PREFIX = '??';
const GUILD_ID = '1431408224837435465'; 
const QUARANTINE_ROLE_ID = '1504790298377584650'; 

// 3. Slash Command Registration
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('antinuke').setDescription('Turn Anti-Nuke on or off')
    .addStringOption(o => o.setName('status').setDescription('on/off').setRequired(true)),
  new SlashCommandBuilder().setName('wl-add').setDescription('Add user to whitelist')
    .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    client.user.setActivity('/help | QINGG', { type: ActivityType.Watching });
    console.log(`🚀 QINGG Online! Your ID is whitelisted.`);
  } catch (err) { console.error("❌ Register Error:", err); }
});

async function getSettings(guildId) {
  let s = await Settings.findOne({ guildId });
  if (!s) s = await Settings.create({ guildId });
  return s;
}

// 4. Interaction Handler (Slash Commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const s = await getSettings(interaction.guildId);
  
  // Whitelist Check
  const isWL = s.whitelist.includes(interaction.user.id);

  if (interaction.commandName === 'ping') {
      return interaction.reply(`🏓 Pong! Latency: **${client.ws.ping}ms**`);
  }

  if (!isWL) return interaction.reply({ content: "❌ You are not whitelisted to use this command.", ephemeral: true });

  if (interaction.commandName === 'antinuke') {
    const status = interaction.options.getString('status').toLowerCase();
    s.antinuke = (status === 'on');
    await s.save();
    interaction.reply(`🛡️ Anti-Nuke: **${s.antinuke ? 'ENABLED' : 'DISABLED'}**`);
  }
  
  if (interaction.commandName === 'wl-add') {
    const target = interaction.options.getUser('user');
    if (!s.whitelist.includes(target.id)) {
        s.whitelist.push(target.id);
        await s.save();
        interaction.reply(`✅ **${target.tag}** has been added to whitelist.`);
    } else {
        interaction.reply(`⚠️ User is already whitelisted.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
