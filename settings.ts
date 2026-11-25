/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

function eventToggle(displayName: string, what: string) {
    return {
        displayName,
        type: OptionType.BOOLEAN as const,
        description: `Post a message when someone ${what}.`,
        default: true
    };
}

function template(description: string, text: string) {
    return {
        type: OptionType.STRING as const,
        description,
        default: text,
        placeholder: text
    };
}

const unusedToggle = () => ({ type: OptionType.BOOLEAN as const, description: "No longer used.", default: true, hidden: true });
const unusedText = () => ({ type: OptionType.STRING as const, description: "No longer used.", default: "", hidden: true });

export const settings = definePluginSettings({
    onlyMonitorOwnChannel: {
        type: OptionType.BOOLEAN,
        description: "Only log events in your current voice channel or the channel you are viewing.",
        default: true
    },
    triggerOnOwnEvents: {
        type: OptionType.BOOLEAN,
        description: "Also log your own voice events.",
        default: false
    },
    consoleLogging: {
        type: OptionType.BOOLEAN,
        description: "Log voice state updates to the console.",
        default: false
    },
    whitelistedGuilds: {
        type: OptionType.STRING,
        description: "Server IDs to always log, even with the own channel option on. One per line.",
        default: "",
        multiline: true
    },

    authorName: {
        type: OptionType.STRING,
        description: "Sender name shown on the messages. You can use {username}, {displayname} and {userid}.",
        default: "Clyde",
        placeholder: "Clyde or {username}"
    },
    authorIconUrl: {
        type: OptionType.STRING,
        description: "Sender icon for the messages, an https address or {avatar}. Leave empty for the default.",
        default: "",
        placeholder: "https://example.com/avatar.png or {avatar}"
    },

    eventUserConnected: eventToggle("Event: Connect", "connects to voice"),
    eventUserDisconnected: eventToggle("Event: Disconnect", "disconnects from voice"),
    eventUserMoved: eventToggle("Event: Move", "moves to another voice channel"),
    eventUserMuted: eventToggle("Event: Mute", "mutes themselves"),
    eventUserUnmuted: eventToggle("Event: Unmute", "unmutes themselves"),
    eventUserDeafens: eventToggle("Event: Deafen", "deafens themselves"),
    eventUserUndeafens: eventToggle("Event: Undeafen", "undeafens themselves"),
    eventUserCameraOn: eventToggle("Event: Camera On", "turns their camera on"),
    eventUserCameraOff: eventToggle("Event: Camera Off", "turns their camera off"),
    eventUserStreamStart: eventToggle("Event: Stream Start", "starts streaming"),
    eventUserStreamStop: eventToggle("Event: Stream Stop", "stops streaming"),
    eventUserServerMuted: eventToggle("Event: Server Mute", "gets muted by the server"),
    eventUserServerUnmuted: eventToggle("Event: Server Unmute", "gets unmuted by the server"),
    eventUserServerDeafened: eventToggle("Event: Server Deafen", "gets deafened by the server"),
    eventUserServerUndeafened: eventToggle("Event: Server Undeafen", "gets undeafened by the server"),

    messageUserConnected: template(
        "Message when someone connects to voice. Variables: {username}, {displayname}, {userid}, {oldChannelName}, {oldChannelId}, {newChannelName}, {newChannelId}, {guildName}, {guildId}, {now}.",
        "🔊 <@{userid}> connected to <#{newChannelId}>"
    ),
    messageUserDisconnected: template("Message when someone disconnects from voice.", "🔇 <@{userid}> disconnected from <#{oldChannelId}>"),
    messageUserMoved: template("Message when someone moves between voice channels.", "🔄 <@{userid}> moved to <#{newChannelId}>"),
    messageUserMuted: template("Message when someone mutes themselves.", "🔇 <@{userid}> muted themselves"),
    messageUserUnmuted: template("Message when someone unmutes themselves.", "🔊 <@{userid}> unmuted themselves"),
    messageUserDeafened: template("Message when someone deafens themselves.", "🤐 <@{userid}> deafened themselves"),
    messageUserUndeafened: template("Message when someone undeafens themselves.", "👂 <@{userid}> undeafened themselves"),
    messageUserCameraOn: template("Message when someone turns their camera on.", "📹 <@{userid}> enabled their camera"),
    messageUserCameraOff: template("Message when someone turns their camera off.", "📴 <@{userid}> disabled their camera"),
    messageUserStreamStart: template("Message when someone starts streaming.", "📺 <@{userid}> started streaming"),
    messageUserStreamStop: template("Message when someone stops streaming.", "⏹️ <@{userid}> stopped streaming"),
    messageUserServerMuted: template("Message when someone gets muted by the server.", "🔇 <@{userid}> was muted by the server"),
    messageUserServerUnmuted: template("Message when someone gets unmuted by the server.", "🔊 <@{userid}> was unmuted by the server"),
    messageUserServerDeafened: template("Message when someone gets deafened by the server.", "🤐 <@{userid}> was deafened by the server"),
    messageUserServerUndeafened: template("Message when someone gets undeafened by the server.", "👂 <@{userid}> was undeafened by the server"),

    enabled: unusedToggle(),
    eventUserJoined: unusedToggle(),
    eventUserLeft: unusedToggle(),
    eventUserDefault: unusedToggle(),
    messageUserJoined: unusedText(),
    messageUserLeft: unusedText(),
    messageUserDefault: unusedText(),
    messageTemplateReference: unusedText()
});
