const { Client, GatewayIntentBits, PermissionsBitField, AuditLogEvent, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

let PREFIX = '!'; // Default prefix

let WHITELIST = ['1302551987031900173']; 
const QUARANTINE_ROLE_ID = '1504790298377584650'; 

client.once('ready', () => {
  console.log(`System Online: ${client.user.tag}`);
});

// --- ANTI-NUKE SYSTEM ---
client.on('channelDelete', async (channel) => {
  const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
  const log = auditLogs.entries.first();
  if (!log) return;
  const { executor } = log;
  if (!WHITELIST.includes(executor.id)) {
    const member = await channel.guild.members.fetch(executor.id);
    await member.roles.set([QUARANTINE_ROLE_ID]).catch(() => member.ban({ reason: 'Anti-Nuke' }));
  }
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ==============================
  // PUBLIC COMMANDS (Everyone can use)
  // ==============================

  if (command === 'ping') {
    return message.reply(`Latency: ${client.ws.ping}ms`);
  }

  if (command === 'serverinfo') {
    return message.reply(`Server Name: ${message.guild.name}\nTotal Members: ${message.guild.memberCount}`);
  }

  if (command === 'nick') {
    const newNick = args.join(' ');
    if (!newNick) return message.reply("Please provide a nickname.");
    try {
      await message.member.setNickname(newNick);
      message.reply(`Your nickname has been changed to: ${newNick}`);
    } catch (err) {
      message.reply("I don't have permission to change your nickname.");
    }
    return;
  }

  // ==============================
  // DANGEROUS COMMANDS (Whitelist Only)
  // ==============================

  const isWhitelisted = WHITELIST.includes(message.author.id);

  if (['ban', 'kick', 'jail', 'say', 'prefix', 'wl', 'unwl'].includes(command)) {
    if (!isWhitelisted) {
      return message.reply("Permission Denied: You are not in the Whitelist.");
    }
  }

  if (command === 'prefix') {
    const newPrefix = args[0];
    if (!newPrefix) return message.reply("Usage: !prefix <new_prefix>");
    PREFIX = newPrefix;
    message.reply(`Prefix has been changed to: ${PREFIX}`);
  }

  if (command === 'wl') {
    const target = message.mentions.users.first();
    if (target && !WHITELIST.includes(target.id)) {
      WHITELIST.push(target.id);
      message.reply(`${target.tag} is now whitelisted.`);
    }
  }

  if (command === 'say') {
    const msg = args.join(' ');
    if (!msg) return message.reply("What do you want me to say?");
    message.delete();
    message.channel.send(msg);
  }

  if (command === 'ban') {
    const member = message.mentions.members.first();
    if (member) {
      await member.ban();
      message.reply(`${member.user.tag} banned.`);
    }
  }

  if (command === 'jail') {
    const member = message.mentions.members.first();
    if (member) {
      await member.roles.set([QUARANTINE_ROLE_ID]);
      message.reply(`${member.user.tag} sent to jail.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
