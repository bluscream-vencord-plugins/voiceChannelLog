/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sendBotMessage } from "@api/Commands";
import { Logger } from "@utils/Logger";
import { parseUrl } from "@utils/misc";
import definePlugin from "@utils/types";
import { Guild, User } from "@vencord/discord-types";
import { AuthenticationStore, ChannelStore, GuildChannelStore, GuildStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { settings } from "./settings";

const PATTERNS = {
    /** A template variable such as {username}. */
    templateVariable: /\{(\w+)\}/g,
    /** Line breaks separating the whitelisted server IDs. */
    lineBreak: /\r?\n/,
    /** Sender icons must be https. */
    iconProtocol: "https:"
};

const logger = new Logger("VoiceChannelChatLog", "#7289da");

interface VoiceStateChange {
    userId: string;
    sessionId?: string | null;
    channelId?: string | null;
    oldChannelId?: string | null;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfVideo: boolean;
    selfStream?: boolean;
}

type Flags = Pick<VoiceStateChange, "deaf" | "mute" | "selfDeaf" | "selfMute" | "selfVideo" | "selfStream">;
type Store = typeof settings.store;
type EventKey = {
    [K in keyof Store]: K extends `event${string}` ? K : never;
}[keyof Store];
type MessageKey = {
    [K in keyof Store]: K extends `message${string}` ? K : never;
}[keyof Store];

interface FlagRule {
    changed(prev: Flags, next: Flags): boolean;
    on(next: Flags): boolean;
    onEvent: EventKey;
    onMessage: MessageKey;
    offEvent: EventKey;
    offMessage: MessageKey;
}

const FLAG_RULES: FlagRule[] = [
    { changed: (p, n) => p.selfMute !== n.selfMute, on: n => n.selfMute, onEvent: "eventUserMuted", onMessage: "messageUserMuted", offEvent: "eventUserUnmuted", offMessage: "messageUserUnmuted" },
    { changed: (p, n) => p.selfDeaf !== n.selfDeaf, on: n => n.selfDeaf, onEvent: "eventUserDeafens", onMessage: "messageUserDeafened", offEvent: "eventUserUndeafens", offMessage: "messageUserUndeafened" },
    { changed: (p, n) => p.selfVideo !== n.selfVideo, on: n => n.selfVideo, onEvent: "eventUserCameraOn", onMessage: "messageUserCameraOn", offEvent: "eventUserCameraOff", offMessage: "messageUserCameraOff" },
    { changed: (p, n) => !!p.selfStream !== !!n.selfStream, on: n => !!n.selfStream, onEvent: "eventUserStreamStart", onMessage: "messageUserStreamStart", offEvent: "eventUserStreamStop", offMessage: "messageUserStreamStop" },
    { changed: (p, n) => p.mute !== n.mute && p.selfMute === n.selfMute, on: n => n.mute, onEvent: "eventUserServerMuted", onMessage: "messageUserServerMuted", offEvent: "eventUserServerUnmuted", offMessage: "messageUserServerUnmuted" },
    { changed: (p, n) => p.deaf !== n.deaf && p.selfDeaf === n.selfDeaf, on: n => n.deaf, onEvent: "eventUserServerDeafened", onMessage: "messageUserServerDeafened", offEvent: "eventUserServerUndeafened", offMessage: "messageUserServerUndeafened" }
];

let myLastVoiceChannelId: string | null = null;
const previousVoiceStates = new Map<string, Flags>();

function fill(template: string, values: Record<string, string>) {
    return template.replace(PATTERNS.templateVariable, (match, key: string) => Object.hasOwn(values, key) ? values[key] : match);
}

function findAssociatedTextChannel(voiceChannelId: string) {
    const voiceChannel = ChannelStore.getChannel(voiceChannelId);
    if (!voiceChannel?.guild_id) return null;
    const textChannel = GuildChannelStore.getFirstChannelOfType(
        voiceChannel.guild_id,
        ({ channel }) => channel.name === voiceChannel.name && channel.parent_id === voiceChannel.parent_id,
        "SELECTABLE"
    );
    return textChannel?.id ?? voiceChannelId;
}

function post(store: Store, template: string, textChannelId: string | null, user: User, guild: Guild | undefined, newChannelId: string | null, oldChannelId: string | null) {
    if (!textChannelId || !template.trim()) return;

    const userValues = {
        username: user.username,
        displayname: user.globalName || user.username,
        userid: user.id
    };
    const content = fill(template, {
        ...userValues,
        oldChannelName: (oldChannelId && ChannelStore.getChannel(oldChannelId)?.name) || "Unknown Channel",
        oldChannelId: oldChannelId ?? "",
        newChannelName: (newChannelId && ChannelStore.getChannel(newChannelId)?.name) || "Unknown Channel",
        newChannelId: newChannelId ?? "",
        guildName: guild?.name ?? "Unknown Guild",
        guildId: guild?.id ?? "",
        now: new Date().toLocaleString()
    });

    const author: { username: string; avatar_url?: string; } = { username: fill(store.authorName, userValues) };
    const icon = fill(store.authorIconUrl, { ...userValues, avatar: user.getAvatarURL() }).trim();
    if (icon && parseUrl(icon)?.protocol === PATTERNS.iconProtocol) author.avatar_url = icon;

    sendBotMessage(textChannelId, { content, author });
}

function isRelevant(store: Store, channelIds: (string | null)[], whitelist: Set<string>) {
    if (!store.onlyMonitorOwnChannel) return true;
    const mine = SelectedChannelStore.getVoiceChannelId();
    const viewing = SelectedChannelStore.getChannelId();
    return channelIds.some(id => {
        if (!id) return false;
        if (id === mine || id === viewing) return true;
        const guildId = ChannelStore.getChannel(id)?.guild_id;
        return !!guildId && whitelist.has(guildId);
    });
}

function handleVoiceState(state: VoiceStateChange, store: Store, myId: string, mySessionId: string, whitelist: Set<string>) {
    const { userId } = state;
    const channelId = state.channelId ?? null;
    const isMe = userId === myId;

    let oldChannelId = state.oldChannelId ?? null;
    if (isMe && state.sessionId === mySessionId) {
        oldChannelId = myLastVoiceChannelId;
        myLastVoiceChannelId = channelId;
    }

    const previous = previousVoiceStates.get(userId);
    if (channelId) {
        previousVoiceStates.set(userId, {
            deaf: state.deaf,
            mute: state.mute,
            selfDeaf: state.selfDeaf,
            selfMute: state.selfMute,
            selfVideo: state.selfVideo,
            selfStream: state.selfStream
        });
    } else {
        previousVoiceStates.delete(userId);
    }

    if (store.consoleLogging) logger.debug("Voice state update", { userId, channelId, oldChannelId });
    if (isMe && !store.triggerOnOwnEvents) return;

    const flagChanges = previous && channelId ? FLAG_RULES.filter(rule => rule.changed(previous, state)) : [];
    const moved = channelId !== oldChannelId;
    if (!moved && !flagChanges.length) return;
    if (!isRelevant(store, [channelId, oldChannelId], whitelist)) return;

    const user = UserStore.getUser(userId);
    if (!user) return;
    const guildId = ChannelStore.getChannel(channelId ?? oldChannelId ?? "")?.guild_id;
    const guild = guildId ? GuildStore.getGuild(guildId) : undefined;

    if (channelId) {
        const textChannelId = findAssociatedTextChannel(channelId);
        for (const rule of flagChanges) {
            const on = rule.on(state);
            if (store[on ? rule.onEvent : rule.offEvent])
                post(store, store[on ? rule.onMessage : rule.offMessage], textChannelId, user, guild, channelId, oldChannelId);
        }
    }

    if (!moved) return;
    if (channelId && oldChannelId) {
        if (!store.eventUserMoved) return;
        post(store, store.messageUserMoved, findAssociatedTextChannel(oldChannelId), user, guild, channelId, oldChannelId);
        post(store, store.messageUserMoved, findAssociatedTextChannel(channelId), user, guild, channelId, oldChannelId);
    } else if (channelId) {
        if (store.eventUserConnected) post(store, store.messageUserConnected, findAssociatedTextChannel(channelId), user, guild, channelId, null);
    } else if (oldChannelId) {
        if (store.eventUserDisconnected) post(store, store.messageUserDisconnected, findAssociatedTextChannel(oldChannelId), user, guild, null, oldChannelId);
    }
}

export default definePlugin({
    name: "VoiceChannelChatLog",
    description: "Posts local messages in a voice channel's chat when people join, leave, move, mute, deafen, stream or turn on their camera.",
    authors: [
        { name: "Bluscream", id: 467777925790564352n },
        { name: "b1uscr34m", id: 896443818935713853n },
        { name: "Cursor.AI", id: 0n }
    ],
    settings,

    start() {
        myLastVoiceChannelId = SelectedChannelStore.getVoiceChannelId() ?? null;
    },

    stop() {
        previousVoiceStates.clear();
        myLastVoiceChannelId = null;
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChange[]; }) {
            const store = settings.plain;
            const myId = UserStore.getCurrentUser().id;
            const mySessionId = AuthenticationStore.getSessionId();
            const whitelist = new Set(store.whitelistedGuilds.split(PATTERNS.lineBreak).map(id => id.trim()).filter(Boolean));
            for (const state of voiceStates) handleVoiceState(state, store, myId, mySessionId, whitelist);
        }
    }
});
