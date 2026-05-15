const http = require('http');
const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const mongoose = require('mongoose');

// 1. Render Keep-Alive (Port binding)
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write("QINGG Bot is Awake and Running!");
  res.end();
}).listen(process.env.PORT || 10000);

// 2. MongoDB Connection Setup
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
    console.error("❌ ERROR: MONGO_URI is missing in Render Environment Variables!");
} else {
    mongoose.connect(mongoURI)
      .then(() => console.log('✅ QINGG connected to Database!'))
      .catch(err => console.error('❌ Database Connection Error:', err));
}

// Database Schema (Saves your Whitelist permanently)
const SettingsSchema = new mongoose.Schema({
  guildId: String,
  whitelist: { type: [String], default: ['1302551987031900173'] }, // 
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
const QUARANTINE_ROLE_ID = '1504790298377584650';

// 3. Registering Slash Commands (Fixed ValidationError)
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check QINGG bot latency and speed'),
  new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Enable or Disable the Anti-Nuke system')
    .addStringOption(o => o.setName('status').setDescription('Type on or off').setRequired(true)),
  new SlashCommandBuilder()
    .setName('wl-add')
    .setDescription('Add a trusted user to the permanent whitelist')
    .addUserOption(o => o.setName('user').setDescription('The user you want to whitelist').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    // Registering commands to all guilds
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    client.user.setActivity('/help | QINGG', { type: ActivityType.Playing });
    console.log(`🚀 QINGG is Online! Logged in as ${client.user.tag}`);
  } catch (err) { 
    console.error("❌ Slash Command Error:", err); 
  }
});

// Helper function to get/create settings for a server
async function getSettings(guildId) {
  let s = await Settings.findOne({ guildId });
  if (!s) s = await Settings.create({ guildId });
  return s;
}

// 4. Anti-Nuke Detection (Channel Delete)
client.on('channelDelete', async (channel) => {
  const s = await getSettings(channel.guild.id);
  if (!s.antinuke) return; // System off hole kichu korbe na

  const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
  const log = logs.entries.first();
  
  if (log && !s.whitelist.includes(log.executor.id)) {
    const member = await channel.guild.members.fetch(log.executor.id).catch(() => null);
    if (member) {
        // Try to jail/quarantine, otherwise ban
        await member.roles.set([QUARANTINE_ROLE_ID])
          .catch(() => member.ban({ reason: 'QINGG Anti-Nuke: Unauthorized Channel Deletion' }));
    }
  }
});

// 5. Slash Command Handler (Interaction)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  const s = await getSettings(interaction.guildId);
  const isWL = s.whitelist.includes(interaction.user.id);

  if (interaction.commandName === 'ping') {
    return interaction.reply(`🏓 Pong! Latency: **${client.ws.ping}ms**`);
  }

  // Whitelist-only commands below
  if (!isWL) return interaction.reply({ content: "❌ Access Denied. You are not in the database whitelist.", ephemeral: true });

  if (interaction.commandName === 'antinuke') {
    const status = interaction.options.getString('status').toLowerCase();
    s.antinuke = (status === 'on');
    await s.save();
    interaction.reply(`🛡️ Anti-Nuke has been: **${s.antinuke ? 'ENABLED' : 'DISABLED'}**`);
  }
  
  if (interaction.commandName === 'wl-add') {
    const target = interaction.options.getUser('user');
    if (!s.whitelist.includes(target.id)) {
        s.whitelist.push(target.id);
        await s.save();
        interaction.reply(`✅ **${target.tag}** added to the database whitelist.`);
    } else {
        interaction.reply(`⚠️ This user is already whitelisted.`);
    }
  }
});

// 6. Prefix Command Handler (??)
client.on('messageCreate', async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;
  
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  const s = await getSettings(message.guild.id);
  const isWL = s.whitelist.includes(message.author.id);

  if (cmd === 'ping') return message.reply("QINGG is active and responding! 🚀");
  
  // Whitelist-only
  if (!isWL) return;

  if (cmd === 'antinuke') {
    const status = args[0]?.toLowerCase();
    if (!status) return message.reply("Usage: `??antinuke on` or `??antinuke off`.");
    s.antinuke = (status === 'on');
    await s.save();
    message.reply(`🛡️ Anti-Nuke updated to: **${s.antinuke ? 'ON' : 'OFF'}**`);
  }

  if (cmd === 'wl') {
    const user = message.mentions.users.first();
    if (!user) return message.reply("Mention a user to whitelist.");
    
    if (!s.whitelist.includes(user.id)) {
        s.whitelist.push(user.id);
        await s.save();
        message.reply(`✅ QINGG added **${user.tag}** to Whitelist.`);
    } else {
        message.reply("⚠️ User is already in the database.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
