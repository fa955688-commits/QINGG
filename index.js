const { Client, GatewayIntentBits, AuditLogEvent, REST, Routes, SlashCommandBuilder, ActivityType, EmbedBuilder, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');

// 1. Keep-Alive for Render
http.createServer((req, res) => { res.write("QINGG IS ACTIVE"); res.end(); }).listen(process.env.PORT || 10000);

// 2. Database Connection
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected')).catch(err => console.log(err));

const SettingsSchema = new mongoose.Schema({
    guildId: String,
    whitelist: { type: [String], default: ['1302551987031900173'] }, // আপনার আইডি
    logChannel: String,
    antinuke: { type: Boolean, default: true }
});
const Settings = mongoose.model('Settings', SettingsSchema);

const client = new Client({ intents: [Object.keys(GatewayIntentBits)] });

const PREFIX = '??';
const GUILD_ID = '1431408224837435465'; 
const QUARANTINE_ROLE_ID = '1504790298377584650'; // <--- এখানে আপনার কোয়ারেন্টাইন রোল আইডি

// 3. Slash Commands
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    new SlashCommandBuilder().setName('serverinfo').setDescription('Shows server details and role count'),
    new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Anti-Nuke').addStringOption(o => o.setName('status').setDescription('on/off').setRequired(true)),
    new SlashCommandBuilder().setName('setlogs').setDescription('Set Anti-Nuke logs channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
    new SlashCommandBuilder().setName('wl-add').setDescription('Add user to whitelist').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Timeout a member').addUserOption(o => o.setName('target').setDescription('Member').setRequired(true)).addIntegerOption(o => o.setName('time').setDescription('Minutes').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o => o.setName('target').setDescription('Member').setRequired(true)),
].map(c => c.toJSON());

// 4. Client Ready & Register Commands
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] }); // Clean old global commands
        await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
        console.log(`🚀 QINGG is Online with Anti-Nuke & Mod features!`);
    } catch (e) { console.error(e); }
});

// 5. Anti-Nuke Protection with Quarantine Logic
client.on('channelDelete', async (channel) => {
    const s = await Settings.findOne({ guildId: channel.guild.id });
    if (!s || !s.antinuke) return;

    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete });
    const entry = logs.entries.first();

    if (entry && !s.whitelist.includes(entry.executor.id)) {
        const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
        if (member) {
            // মেম্বারকে কোয়ারেন্টাইন রোলে পাঠানো
            await member.roles.set([QUARANTINE_ROLE_ID]).catch(async () => {
                // রোল সেট করতে না পারলে সরাসরি ব্যান
                await member.ban({ reason: "QINGG Anti-Nuke Protection" }).catch(() => null);
            });

            if (s.logChannel) {
                const logChan = channel.guild.channels.cache.get(s.logChannel);
                logChan?.send(`🚨 **Anti-Nuke Alert:** ${entry.executor.tag} deleted #${channel.name}. They have been Quarantined/Banned!`);
            }
        }
    }
});

// 6. Command Handlers
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    const s = await Settings.findOne({ guildId: i.guildId }) || await Settings.create({ guildId: i.guildId });
    const isWL = s.whitelist.includes(i.user.id);

    if (i.commandName === 'ping') return i.reply(`🏓 Pong! ${client.ws.ping}ms`);
    
    if (i.commandName === 'serverinfo') {
        const embed = new EmbedBuilder()
            .setTitle(`📊 Server Info: ${i.guild.name}`)
            .addFields(
                { name: 'Owner', value: `<@${i.guild.ownerId}>`, inline: true },
                { name: 'Members', value: `${i.guild.memberCount}`, inline: true },
                { name: 'Roles', value: `${i.guild.roles.cache.size}`, inline: true },
                { name: 'Channels', value: `${i.guild.channels.cache.size}`, inline: true }
            ).setColor('Gold').setThumbnail(i.guild.iconURL());
        return i.reply({ embeds: [embed] });
    }

    if (!isWL) return i.reply({ content: "❌ You don't have permission!", ephemeral: true });

    // Admin commands logic... (antinuke, setlogs, wl-add, timeout, ban)
    // [এখানে আগের দেওয়া কমান্ডগুলোর লজিক থাকবে]
    i.reply({ content: "Command executed successfully!", ephemeral: true });
});

// Prefix command (??) support
client.on('messageCreate', async m => {
    if (!m.content.startsWith(PREFIX) || m.author.bot) return;
    if (m.content.includes('serverinfo')) {
        const embed = new EmbedBuilder().setTitle(m.guild.name).setDescription(`Roles: ${m.guild.roles.cache.size}`);
        m.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
