const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, AuditLogEvent, ActivityType, PermissionsBitField } = require('discord.js');
const mongoose = require('mongoose');
const http = require('http');

// 1. RENDER KEEP-ALIVE
http.createServer((req, res) => { res.write("QINGG POWERHOUSE ACTIVE"); res.end(); }).listen(process.env.PORT || 10000);

// 2. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected')).catch(e => console.log(e));

const Settings = mongoose.model('Settings', new mongoose.Schema({
    guildId: String,
    whitelist: { type: [String], default: ['1302551987031900173'] },
    logChannel: String,
    antinuke: { type: Boolean, default: true },
    antiAlt: { type: Boolean, default: false }
}));

const client = new Client({ intents: 3276799 }); // Full Intents Enabled
const PREFIX = '??';
const GUILD_ID = '1431408224837435465'; 
const QUARANTINE_ROLE_ID = '1504790298377584650';

// 3. 50+ SLASH COMMANDS DEFINITION
const commands = [
    // --- Anti-Nuke & Security (15) ---
    new SlashCommandBuilder().setName('antinuke').setDescription('Toggle Protection').addStringOption(o => o.setName('status').setRequired(true).addChoices({name:'Enable',value:'on'},{name:'Disable',value:'off'})),
    new SlashCommandBuilder().setName('setlogs').setDescription('Set security log channel').addChannelOption(o => o.setName('c').setRequired(true)),
    new SlashCommandBuilder().setName('wl-add').setDescription('Add user to whitelist').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('wl-remove').setDescription('Remove from whitelist').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('wl-list').setDescription('Show all whitelisted users'),
    new SlashCommandBuilder().setName('anti-alt').setDescription('Toggle Anti-Alt').addStringOption(o => o.setName('s').setRequired(true).addChoices({name:'On',value:'on'},{name:'Off',value:'off'})),
    new SlashCommandBuilder().setName('lockdown').setDescription('Lock all server channels'),
    new SlashCommandBuilder().setName('unlockdown').setDescription('Unlock all server channels'),
    new SlashCommandBuilder().setName('quarantine').setDescription('Manual Quarantine').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('unquarantine').setDescription('Remove from Quarantine').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('config').setDescription('Check current bot settings'),
    new SlashCommandBuilder().setName('backup').setDescription('Create server backup'),
    new SlashCommandBuilder().setName('restore').setDescription('Restore server from backup'),
    new SlashCommandBuilder().setName('extra-owner').setDescription('Add secondary owner for bot control').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('security-status').setDescription('Shows vulnerability scan'),

    // --- Moderation (15) ---
    new SlashCommandBuilder().setName('ban').setDescription('Ban a user').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Kick a user').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('unban').setDescription('Unban a user ID').addStringOption(o => o.setName('id').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('Mute member').addUserOption(o => o.setName('u').setRequired(true)).addIntegerOption(o => o.setName('m').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Delete messages').addIntegerOption(o => o.setName('n').setRequired(true)),
    new SlashCommandBuilder().setName('nuke').setDescription('Clone and delete channel'),
    new SlashCommandBuilder().setName('lock').setDescription('Lock channel'),
    new SlashCommandBuilder().setName('unlock').setDescription('Unlock channel'),
    new SlashCommandBuilder().setName('hide').setDescription('Hide channel'),
    new SlashCommandBuilder().setName('unhide').setDescription('Show hidden channel'),
    new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode').addIntegerOption(o => o.setName('s').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('Warn user').addUserOption(o => o.setName('u').setRequired(true)).addStringOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('warnings').setDescription('Check user warnings').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('clear-warns').setDescription('Clear user warnings').addUserOption(o => o.setName('u').setRequired(true)),
    new SlashCommandBuilder().setName('softban').setDescription('Ban and instantly unban user'),

    // --- Role Management (10) ---
    new SlashCommandBuilder().setName('role-add').setDescription('Add role').addUserOption(o => o.setName('u').setRequired(true)).addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-remove').setDescription('Remove role').addUserOption(o => o.setName('u').setRequired(true)).addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-create').setDescription('Create role').addStringOption(o => o.setName('n').setRequired(true)),
    new SlashCommandBuilder().setName('role-delete').setDescription('Delete role').addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-all').setDescription('Give role to all').addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-humans').setDescription('Give role to all humans').addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-bots').setDescription('Give role to all bots').addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-info').setDescription('Role details').addRoleOption(o => o.setName('r').setRequired(true)),
    new SlashCommandBuilder().setName('role-rename').setDescription('Rename a role').addRoleOption(o => o.setName('r').setRequired(true)).addStringOption(o => o.setName('n').setRequired(true)),
    new SlashCommandBuilder().setName('role-list').setDescription('Show all server roles'),

    // --- Info & Utility (12) ---
    new SlashCommandBuilder().setName('serverinfo').setDescription('Detailed stats'),
    new SlashCommandBuilder().setName('userinfo').setDescription('User stats').addUserOption(o => o.setName('u').setRequired(false)),
    new SlashCommandBuilder().setName('avatar').setDescription('Show avatar'),
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    new SlashCommandBuilder().setName('uptime').setDescription('Bot online time'),
    new SlashCommandBuilder().setName('membercount').setDescription('Show count'),
    new SlashCommandBuilder().setName('invite').setDescription('Invite link'),
    new SlashCommandBuilder().setName('botinfo').setDescription('System stats'),
    new SlashCommandBuilder().setName('help').setDescription('Commands list'),
    new SlashCommandBuilder().setName('boosters').setDescription('Show server boosters'),
    new SlashCommandBuilder().setName('emojis').setDescription('List all server emojis'),
    new SlashCommandBuilder().setName('stats').setDescription('Detailed bot performance'),
].map(c => c.toJSON());

// 4. REGISTRATION & READY
client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('🧹 Cleaning old command cache...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] }); 
        await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
        client.user.setActivity(`${PREFIX}help | Ultra Security`, { type: ActivityType.Streaming, url: "https://twitch.tv/discord" });
        console.log(`🚀 QINGG Sterix Style Online! 50+ Commands Loaded.`);
    } catch (e) { console.error(e); }
});

// 5. CORE SECURITY: ANTI-NUKE & QUARANTINE
client.on('channelDelete', async (channel) => {
    const s = await Settings.findOne({ guildId: channel.guild.id });
    if (!s || !s.antinuke) return;
    const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
    const entry = logs?.entries.first();
    
    if (entry && !s.whitelist.includes(entry.executor.id)) {
        const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
        if (member) {
            await member.roles.set([QUARANTINE_ROLE_ID]).catch(() => member.ban({ reason: "Sterix-Protection: Unauthorized Deletion" }));
            if (s.logChannel) {
                const c = channel.guild.channels.cache.get(s.logChannel);
                c?.send({ embeds: [new EmbedBuilder().setTitle("🚨 SECURITY ALERT").setDescription(`User **${entry.executor.tag}** was quarantined for deleting #${channel.name}`).setColor("Red")] });
            }
        }
    }
});

// 6. INTERACTION HANDLER
client.on('interactionCreate', async i => {
    if (!i.isChatInputCommand()) return;
    const s = await Settings.findOne({ guildId: i.guildId }) || await Settings.create({ guildId: i.guildId });
    const isWL = s.whitelist.includes(i.user.id) || i.user.id === i.guild.ownerId;

    if (i.commandName === 'ping') return i.reply(`🏓 **Pong!** \`${client.ws.ping}ms\``);
    
    if (!isWL) {
        const modCmds = ['ban', 'kick', 'antinuke', 'wl-add', 'setlogs', 'lockdown', 'nuke'];
        if (modCmds.includes(i.commandName)) return i.reply({ content: "❌ Access Denied: Whitelist Only!", ephemeral: true });
    }

    if (i.commandName === 'antinuke') {
        s.antinuke = i.options.getString('status') === 'on'; await s.save();
        i.reply(`🛡️ Anti-Nuke Status: **${s.antinuke ? 'ENABLED' : 'DISABLED'}**`);
    }

    if (i.commandName === 'help') {
        const emb = new EmbedBuilder().setTitle("📜 QINGG COMMANDS (50+)").setColor("Gold")
            .addFields(
                { name: '🛡️ Security', value: 'antinuke, wl-add, wl-list, setlogs, anti-alt, lockdown, quarantine, backup', inline: false },
                { name: '🛠️ Moderation', value: 'ban, kick, timeout, unban, clear, nuke, lock, hide, slowmode, warn', inline: false },
                { name: '🎭 Roles', value: 'role-add, role-remove, role-all, role-humans, role-create, role-list', inline: false },
                { name: '📊 Utility', value: 'ping, serverinfo, userinfo, uptime, membercount, emojis, boost', inline: false }
            );
        i.reply({ embeds: [emb] });
    }
    
    // logic for other commands...
});

client.login(process.env.DISCORD_TOKEN);
